import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config(); // Cargar .env desde la raíz
const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// ==========================================
// 1. MIDDLEWARE Y SEGURIDAD
// ==========================================

const authenticate = (req, res, next) => {
    // Excluimos las rutas públicas (Login y Registro no piden token)
    if (req.path === '/users/login' || req.path === '/users/register') {
        return next();
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ statusCode: 401, intOpCode: 'USR401', message: 'Token ausente o inválido', data: [] });
    }

    try {
        const token = authHeader.split(' ')[1];
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch (error) {
        return res.status(401).json({ statusCode: 401, intOpCode: 'USR401', message: 'Token expirado', data: [] });
    }
};

const hasGlobalPermission = (user, perm) => {
    const perms = user.permissions || [];
    return perms.includes(perm) || perms.includes('user:manage'); // user:manage es Dios aquí
};

app.use(authenticate);

// ==========================================
// 2. ENDPOINTS PÚBLICOS (AUTH)
// ==========================================

app.post('/users/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const { data: user, error: userError } = await supabase
            .from('usuarios')
            .select('*')
            .eq('email', email)
            .eq('password', password)
            .single();

        if (userError || !user) {
            return res.status(401).json({ statusCode: 401, intOpCode: 'USR401', message: 'Credenciales inválidas', data: [] });
        }

        await supabase.from('usuarios').update({ last_login: new Date() }).eq('id', user.id);

        let permisosNombres = [];
        if (user.permisos_globales && user.permisos_globales.length > 0) {
            const { data: permisosData } = await supabase.from('permisos').select('nombre').in('id', user.permisos_globales);
            permisosNombres = permisosData.map(p => p.nombre);
        }

        const token = jwt.sign({
            userId: user.id, username: user.username, email: user.email, permissions: permisosNombres
        }, process.env.JWT_SECRET, { expiresIn: '8h' });

        res.status(200).json({
            statusCode: 200, intOpCode: 'USR200', message: "Login exitoso",
            data: [{ token: token, user: { id: user.id, username: user.username, email: user.email, permissions: permisosNombres } }]
        });
    } catch (error) {
        res.status(500).json({ statusCode: 500, intOpCode: 'USR500', message: error.message, data: [] });
    }
});

app.post('/users/register', async (req, res) => {
    const { nombre_completo, username, email, password, direccion, telefono, permisos_nombres } = req.body;
    try {
        let permisosIds = [];
        if (permisos_nombres && permisos_nombres.length > 0) {
            const { data: perms } = await supabase.from('permisos').select('id').in('nombre', permisos_nombres);
            permisosIds = perms.map(p => p.id);
        }

        const { data, error } = await supabase.from('usuarios').insert([{
            nombre_completo, username, email, password, direccion, telefono, permisos_globales: permisosIds
        }]).select();

        if (error) return res.status(400).json({ statusCode: 400, intOpCode: 'USR400', message: error.message, data: [] });

        res.status(201).json({ statusCode: 201, intOpCode: 'USR201', message: "Usuario registrado", data: data });
    } catch (error) {
        res.status(500).json({ statusCode: 500, intOpCode: 'USR500', message: error.message, data: [] });
    }
});

// ==========================================
// 3. ENDPOINTS PROTEGIDOS (CRUD USUARIOS)
// ==========================================

// 🟢 GET /users -> Obtener todos los usuarios (Requiere: user:view)
app.get('/users', async (req, res) => {
    if (!hasGlobalPermission(req.user, 'user:view')) {
        return res.status(403).json({ statusCode: 403, intOpCode: 'USR403', message: 'Falta permiso: user:view', data: [] });
    }

    try {
        const { data: users, error } = await supabase.from('usuarios').select('id, nombre_completo, username, email, telefono, direccion, creado_en, permisos_globales');
        if (error) throw error;

        // Traemos todos los permisos del sistema para cruzarlos rápidamente
        const { data: permisos } = await supabase.from('permisos').select('id, nombre');
        const mapaPermisos = {};
        if (permisos) permisos.forEach(p => mapaPermisos[p.id] = p.nombre);

        // Transformamos el arreglo de UUIDs en un arreglo de textos ["user:add", "ticket:view"]
        const usuariosMapeados = users.map(u => ({
            ...u,
            permisos_nombres: (u.permisos_globales || []).map(id => mapaPermisos[id]).filter(Boolean)
        }));

        res.status(200).json({ statusCode: 200, intOpCode: 'USR200', message: 'Usuarios obtenidos', data: usuariosMapeados });
    } catch (error) {
        res.status(500).json({ statusCode: 500, intOpCode: 'USR500', message: error.message, data: [] });
    }
});

// 🟢 PUT /users/:id -> Editar un usuario
app.put('/users/:id', async (req, res) => {
    const targetUserId = req.params.id;
    const isSelf = req.user.userId === targetUserId;

    // Validación inteligente de permisos
    if (isSelf && !hasGlobalPermission(req.user, 'user:edit:profile')) {
        return res.status(403).json({ statusCode: 403, intOpCode: 'USR403', message: 'No tienes permiso para editar tu propio perfil (user:edit:profile)', data: [] });
    }
    if (!isSelf && !hasGlobalPermission(req.user, 'user:edit')) {
        return res.status(403).json({ statusCode: 403, intOpCode: 'USR403', message: 'No tienes permiso para editar a otros usuarios (user:edit)', data: [] });
    }

    const { nombre_completo, username, email, telefono, direccion, permisos_nombres } = req.body;
    let updateData = { nombre_completo, username, email, telefono, direccion };

    // Solo alguien con user:manage puede cambiarle los permisos a alguien
    if (permisos_nombres && hasGlobalPermission(req.user, 'user:manage')) {
        const { data: perms } = await supabase.from('permisos').select('id').in('nombre', permisos_nombres);
        updateData.permisos_globales = perms.map(p => p.id);
    }

    const { data, error } = await supabase.from('usuarios').update(updateData).eq('id', targetUserId).select();

    if (error) return res.status(400).json({ statusCode: 400, intOpCode: 'USR400', message: error.message, data: [] });
    res.status(200).json({ statusCode: 200, intOpCode: 'USR200', message: 'Usuario actualizado', data: data });
});

// 🟢 DELETE -> Eliminar usuario (Con limpieza en cascada)
app.delete('/users/:id', async (req, res) => {
    const { id } = req.params;

    try {
        // 1. Quitarlo de todos los grupos (Membresías)
        await supabase.from('grupo_miembros').delete().eq('usuario_id', id);

        // 2. Quitarle todos los permisos especiales de grupo
        await supabase.from('grupo_usuario_permisos').delete().eq('usuario_id', id);

        // 3. Desasignarlo de cualquier ticket pendiente (lo dejamos en null para que alguien más lo tome)
        await supabase.from('tickets').update({ asignado_id: null }).eq('asignado_id', id);

        // 4. Ahora sí, intentamos eliminar el registro principal del usuario
        const { data, error } = await supabase.from('usuarios').delete().eq('id', id);

        // Si lanza error aquí, es porque es CREADOR de un grupo o AUTOR de un ticket (Datos históricos intocables)
        if (error) {
            return res.status(400).json({
                statusCode: 400,
                message: 'No se puede eliminar porque ha creado tickets o grupos. En un sistema real, quítale todos los permisos para desactivarlo.'
            });
        }

        return res.status(200).json({ statusCode: 200, message: 'Usuario eliminado correctamente' });
    } catch (error) {
        return res.status(500).json({ statusCode: 500, message: error.message });
    }
});

// 🟢 GET /users/:id/permissions-summary -> Obtener resumen de poderes (Globales y por Grupo)
app.get('/users/:id/permissions-summary', async (req, res) => {
    if (!hasGlobalPermission(req.user, 'user:manage')) return res.status(403).json({ message: 'Denegado' });

    const targetUserId = req.params.id;
    try {
        // 1. Obtener Permisos Globales (De la tabla usuarios)
        const { data: user } = await supabase.from('usuarios').select('permisos_globales').eq('id', targetUserId).single();
        let globalesNombres = [];
        if (user && user.permisos_globales && user.permisos_globales.length > 0) {
            const { data: perms } = await supabase.from('permisos').select('nombre').in('id', user.permisos_globales);
            globalesNombres = perms.map(p => p.nombre);
        }

        // 2. Obtener Permisos Locales (De la tabla pivote de grupos)
        const { data: groupPerms } = await supabase
            .from('grupo_usuario_permisos')
            .select('grupo_id, grupos(nombre), permisos(nombre)')
            .eq('usuario_id', targetUserId);

        // Agrupamos la respuesta por grupo para que Angular la lea fácil
        const grouped = {};
        if (groupPerms) {
            groupPerms.forEach(gp => {
                if (!grouped[gp.grupo_id]) {
                    grouped[gp.grupo_id] = { id: gp.grupo_id, nombre: gp.grupos?.nombre || 'Desconocido', permisos: [] };
                }
                if (gp.permisos?.nombre) grouped[gp.grupo_id].permisos.push(gp.permisos.nombre);
            });
        }

        res.status(200).json({
            statusCode: 200,
            data: { globales: globalesNombres, por_grupo: Object.values(grouped) }
        });
    } catch (error) {
        res.status(500).json({ statusCode: 500, message: error.message });
    }
});

// 🟢 GET -> Saber en qué grupos está el usuario
app.get('/users/:id/grupos', async (req, res) => {
    const { id } = req.params;
    try {
        const { data } = await supabase.from('grupo_miembros').select('grupo_id').eq('usuario_id', id);
        return res.status(200).json({ data: data ? data.map(g => g.grupo_id) : [] });
    } catch (error) {
        return res.status(500).json({ message: error.message, data: [] });
    }
});

// 🟢 PUT -> Guardar los grupos del usuario
app.put('/users/:id/grupos', async (req, res) => {
    const { id } = req.params;
    const { grupos } = req.body; // Recibimos el arreglo [id_grupo1, id_grupo2]

    try {
        // Borramos los anteriores y guardamos los nuevos
        await supabase.from('grupo_miembros').delete().eq('usuario_id', id);

        if (grupos && grupos.length > 0) {
            const payload = grupos.map(grupo_id => ({ usuario_id: id, grupo_id: grupo_id }));
            await supabase.from('grupo_miembros').insert(payload);
        }
        return res.status(200).json({ message: 'Grupos guardados' });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
});

app.listen(3001, () => {
    console.log('👤 Servicio de Usuarios corriendo en puerto 3001');
});