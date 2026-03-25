require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json()); // Para poder leer JSON

// Conexión a Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// ==========================================
// API 1: LOGIN (/login)
// ==========================================
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // 1. Buscar al usuario por email y contraseña
        // Nota: En un entorno real usarías bcrypt, aquí comparamos texto plano según los dummies
        const { data: user, error: userError } = await supabase
            .from('usuarios')
            .select('*')
            .eq('email', email)
            .eq('password', password)
            .single();

        if (userError || !user) {
            return res.status(401).json({ statusCode: 401, intOpCode: 1, message: 'Credenciales inválidas' });
        }

        // 2. Actualizar el last_login
        await supabase.from('usuarios').update({ last_login: new Date() }).eq('id', user.id);

        // 3. Obtener los nombres en texto de los permisos basados en los UUIDs del usuario
        let permissionNames = [];
        if (user.permisos_globales && user.permisos_globales.length > 0) {
            const { data: perms } = await supabase
                .from('permisos')
                .select('nombre')
                .in('id', user.permisos_globales);
            permissionNames = perms.map(p => p.nombre);
        }

        // 4. Firmar el Token JWT exacto como el de Koyeb
        const token = jwt.sign(
            {
                email: user.email,
                sub: user.email,
                permissions: permissionNames
            },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        // 5. Devolver el JSON SCHEMA requerido
        res.status(200).json({
            statusCode: 200,
            intOpCode: 0,
            data: [{
                token: token,
                message: "Login exitoso"
            }]
        });

    } catch (error) {
        res.status(500).json({ statusCode: 500, intOpCode: -1, message: error.message });
    }
});

// ==========================================
// API 2: REGISTER (/register)
// ==========================================
// Registro público: Crea un usuario sin permisos especiales por defecto
app.post('/register', async (req, res) => {
    const { nombre_completo, username, email, password, telefono, direccion } = req.body;

    try {
        const { data, error } = await supabase
            .from('usuarios')
            .insert([{
                nombre_completo,
                username,
                email,
                password,
                telefono,
                direccion,
                permisos_globales: [] // Arreglo vacío por defecto
            }])
            .select();

        if (error) throw error;

        res.status(201).json({
            statusCode: 201,
            intOpCode: 0,
            message: "Usuario registrado correctamente",
            data: data
        });
    } catch (error) {
        res.status(400).json({ statusCode: 400, intOpCode: 1, message: error.message });
    }
});

// ==========================================
// API 3: AGREGAR USER (/users)
// ==========================================
// Uso Admin: Similar al registro, pero aquí se le pueden pasar permisos directos
app.post('/users', async (req, res) => {
    // Para simplificar, recibimos un arreglo con los nombres de los permisos ["user:view", "ticket:add"]
    const { nombre_completo, username, email, password, permisos_nombres } = req.body;

    try {
        let permisosIds = [];

        // Si nos envían nombres de permisos, buscamos sus UUIDs reales en la BD
        if (permisos_nombres && permisos_nombres.length > 0) {
            const { data: perms } = await supabase
                .from('permisos')
                .select('id')
                .in('nombre', permisos_nombres);
            permisosIds = perms.map(p => p.id);
        }

        // Insertamos al usuario con esos permisos
        const { data, error } = await supabase
            .from('usuarios')
            .insert([{
                nombre_completo, username, email, password,
                permisos_globales: permisosIds
            }])
            .select();

        if (error) throw error;

        res.status(201).json({
            statusCode: 201,
            intOpCode: 0,
            message: "Usuario agregado desde administración exitosamente",
            data: data
        });
    } catch (error) {
        res.status(400).json({ statusCode: 400, intOpCode: 1, message: error.message });
    }
});

// Levantar el servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servicio ERP corriendo en http://localhost:${PORT}`);
});