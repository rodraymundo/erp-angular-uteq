import express from 'express';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';

// Cargar variables de entorno desde la raíz
dotenv.config();

const app = express();
app.use(express.json());

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// 1. Middleware: Autenticación base (Desencripta el Token)
const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ statusCode: 401, intOpCode: 'GRP401', message: 'Token ausente o inválido', data: [] });
    }
    try {
        const token = authHeader.split(' ')[1];
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch (error) {
        return res.status(401).json({ statusCode: 401, intOpCode: 'GRP401', message: 'Token expirado', data: [] });
    }
};

// 2. Helpers de Seguridad
const hasGlobalPermission = (user, perm) => {
    const perms = user.permissions || [];
    return perms.includes(perm) || perms.includes('user:manage'); // user:manage es el super admin
};

// Revisa si el usuario tiene un permiso específico dentro de un grupo
const checkGroupPermission = async (usuario_id, grupo_id, requiredPerm) => {
    const { data } = await supabase
        .from('grupo_usuario_permisos')
        .select('permisos(nombre)')
        .eq('usuario_id', usuario_id)
        .eq('grupo_id', grupo_id);

    if (!data) return false;

    const perms = data.map(p => p.permisos.nombre);
    return perms.includes(requiredPerm) || perms.includes('group:manage');
};

app.use(authenticate);

// ==========================================
// ENDPOINTS DE GESTIÓN DE GRUPOS (CRUD)
// ==========================================

// 🟢 GET / -> Obtener los grupos a los que pertenezco
// 🟢 GET / -> Obtener grupos (Inteligente según el rol)
app.get('/', async (req, res) => {
    try {
        // 1. ¿Es Administrador? (Ve todos los grupos del sistema)
        if (hasGlobalPermission(req.user, 'group:manage')) {
            const { data, error } = await supabase
                .from('grupos')
                .select('*, creador:usuarios!grupos_creador_id_fkey(nombre_completo)')
                .order('creado_en', { ascending: false });

            if (error) throw error;
            return res.status(200).json({
                statusCode: 200, intOpCode: 'GRP200', message: 'Todos los grupos (Modo Admin)', data: data || []
            });
        }

        // 2. ¿Es Usuario Normal? (Ve SOLO los grupos a los que pertenece)
        const { data, error } = await supabase
            .from('grupo_miembros')
            .select(`
                grupo_id,
                grupos (*, creador:usuarios!grupos_creador_id_fkey(nombre_completo))
            `)
            .eq('usuario_id', req.user.userId);

        if (error) throw error;

        // Extraemos los objetos de grupo del JOIN
        const grupos = data ? data.map(d => d.grupos).filter(g => g !== null) : [];

        res.status(200).json({
            statusCode: 200, intOpCode: 'GRP200', message: 'Mis grupos obtenidos', data: grupos
        });

    } catch (error) {
        res.status(500).json({ statusCode: 500, intOpCode: 'GRP500', message: error.message, data: [] });
    }
});

// 🟢 POST / -> Crear Grupo (Requiere permiso global: group:add)
app.post('/', async (req, res) => {
    if (!hasGlobalPermission(req.user, 'group:add')) {
        return res.status(403).json({ statusCode: 403, intOpCode: 'GRP403', message: 'Falta permiso global: group:add', data: [] });
    }

    const creador_id = req.user.userId;
    const { nombre, descripcion } = req.body;

    // 1. Crear el grupo
    const { data: grupo, error } = await supabase.from('grupos').insert([{ nombre, descripcion, creador_id }]).select().single();
    if (error) return res.status(400).json({ statusCode: 400, intOpCode: 'GRP400', message: error.message, data: [] });

    // 2. Agregar al creador como miembro activo
    await supabase.from('grupo_miembros').insert([{ grupo_id: grupo.id, usuario_id: creador_id }]);

    // 3. Darle permiso total (group:manage) al creador sobre este grupo
    const { data: permManage } = await supabase.from('permisos').select('id').eq('nombre', 'group:manage').single();
    if (permManage) {
        await supabase.from('grupo_usuario_permisos').insert([{ grupo_id: grupo.id, usuario_id: creador_id, permiso_id: permManage.id }]);
    }

    res.status(201).json({ statusCode: 201, intOpCode: 'GRP201', message: 'Grupo creado exitosamente', data: [grupo] });
});

// 🟢 PUT /:id -> Editar Grupo (Requiere permiso de grupo: group:edit o group:manage)
app.put('/:id', async (req, res) => {
    const grupo_id = req.params.id;
    const hasPerm = await checkGroupPermission(req.user.userId, grupo_id, 'group:edit');
    if (!hasPerm) return res.status(403).json({ statusCode: 403, intOpCode: 'GRP403', message: 'No tienes permiso para editar este grupo', data: [] });

    const { nombre, descripcion } = req.body;
    const { data, error } = await supabase.from('grupos').update({ nombre, descripcion }).eq('id', grupo_id).select();

    if (error) return res.status(400).json({ statusCode: 400, intOpCode: 'GRP400', message: error.message, data: [] });
    res.status(200).json({ statusCode: 200, intOpCode: 'GRP200', message: 'Grupo actualizado', data: data });
});

// 🟢 DELETE /:id -> Eliminar Grupo (Requiere permiso de grupo: group:delete o group:manage)
app.delete('/:id', async (req, res) => {
    const grupo_id = req.params.id;
    const hasPerm = await checkGroupPermission(req.user.userId, grupo_id, 'group:delete');
    if (!hasPerm) return res.status(403).json({ statusCode: 403, intOpCode: 'GRP403', message: 'No tienes permiso para eliminar este grupo', data: [] });

    // Borramos dependencias primero para evitar error de Llave Foránea
    await supabase.from('grupo_usuario_permisos').delete().eq('grupo_id', grupo_id);
    await supabase.from('grupo_miembros').delete().eq('grupo_id', grupo_id);
    // Nota: Deberías borrar también los tickets asociados a este grupo aquí si es necesario

    const { data, error } = await supabase.from('grupos').delete().eq('id', grupo_id).select();

    if (error) return res.status(400).json({ statusCode: 400, intOpCode: 'GRP400', message: error.message, data: [] });
    res.status(200).json({ statusCode: 200, intOpCode: 'GRP200', message: 'Grupo eliminado', data: data });
});

// ==========================================
// ENDPOINTS DE PERMISOS POR GRUPO
// ==========================================

// 🟢 GET /:id/my-permissions -> Traer la lista de permisos en texto para Angular
app.get('/:id/my-permissions', async (req, res) => {
    const grupo_id = req.params.id;
    const { data, error } = await supabase
        .from('grupo_usuario_permisos')
        .select('permisos(nombre)')
        .eq('grupo_id', grupo_id)
        .eq('usuario_id', req.user.userId);

    if (error) return res.status(500).json({ statusCode: 500, intOpCode: 'GRP500', message: error.message, data: [] });

    const permisosDelGrupo = data.map(p => p.permisos.nombre);
    res.status(200).json({ statusCode: 200, intOpCode: 'GRP200', message: 'Permisos de grupo obtenidos', data: permisosDelGrupo });
});

// 🟢 POST /:id/members -> Asignar un usuario a un grupo con permisos específicos
app.post('/:id/members', async (req, res) => {
    if (!hasGlobalPermission(req.user, 'user:manage') && !hasGlobalPermission(req.user, 'group:manage')) {
        return res.status(403).json({ statusCode: 403, message: 'Denegado: No tienes permisos para gestionar miembros.' });
    }

    const grupo_id = req.params.id;
    const { usuario_id, permisos_nombres } = req.body;

    try {
        // 1. Asegurar que el usuario exista en la tabla de miembros
        await supabase.from('grupo_miembros').upsert([
            { grupo_id: grupo_id, usuario_id: usuario_id }
        ], { onConflict: 'grupo_id, usuario_id' });

        // 2. Limpiar los permisos que tenía antes en ese grupo (Reset)
        await supabase.from('grupo_usuario_permisos')
            .delete()
            .eq('grupo_id', grupo_id)
            .eq('usuario_id', usuario_id);

        // 3. Traducir textos a UUIDs e insertar los nuevos permisos (UNA FILA POR PERMISO)
        if (permisos_nombres && permisos_nombres.length > 0) {
            const { data: perms } = await supabase.from('permisos').select('id').in('nombre', permisos_nombres);

            // Creamos un arreglo de objetos listos para insertarse en la tabla pivote
            const insertData = perms.map(p => ({
                grupo_id: grupo_id,
                usuario_id: usuario_id,
                permiso_id: p.id
            }));

            const { error: insertError } = await supabase.from('grupo_usuario_permisos').insert(insertData);
            if (insertError) throw insertError;
        }

        res.status(200).json({ statusCode: 200, message: 'Permisos de grupo asignados exitosamente' });
    } catch (error) {
        res.status(500).json({ statusCode: 500, message: error.message });
    }
});
app.listen(3003, () => {
    console.log('👥 Servicio de Grupos corriendo en el puerto 3003');
});