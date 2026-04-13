import Fastify from 'fastify';
import dotenv from 'dotenv';
import jwt from '@fastify/jwt';
import { createClient } from '@supabase/supabase-js';

dotenv.config();
const fastify = Fastify({ logger: true });
fastify.register(jwt, { secret: process.env.JWT_SECRET });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

fastify.addHook('onRequest', async (request, reply) => {
    if (request.method === 'OPTIONS') return; // <-- Parche para evitar Error 401 en comentarios
    try { await request.jwtVerify(); }
    catch (err) { return reply.status(401).send({ message: 'Token inválido', data: [] }); }
});

// Revisa si tiene el poder en TODO el sistema
const hasPermission = (user, perm) => {
    const perms = user.permissions || [];
    return perms.includes(perm) || perms.includes('ticket:manage');
};

// Revisa si tiene el poder en UN GRUPO específico
const checkGroupPermission = async (usuario_id, grupo_id, requiredPerm) => {
    const { data } = await supabase
        .from('grupo_usuario_permisos')
        .select('permisos(nombre)')
        .eq('usuario_id', usuario_id)
        .eq('grupo_id', grupo_id);

    if (!data) return false;
    const perms = data.map(p => p.permisos.nombre);
    return perms.includes(requiredPerm) || perms.includes('ticket:manage');
};

const getIdPorNombre = async (tabla, nombre) => {
    if (!nombre || nombre.includes('-')) return nombre;
    const { data } = await supabase.from(tabla).select('id').ilike('nombre', nombre).single();
    return data ? data.id : nombre;
};

// =========================================================
// 🟢 GET TICKETS (LÓGICA PRINCIPAL AISLADA)
// =========================================================
const getTicketsHandler = async (request, reply) => {
    const { grupo_id } = request.query;
    const userId = request.user.userId;

    console.log(`\n[GET /tickets] Solicitud de Usuario: ${userId} | Tablero: ${grupo_id || 'Global/Dashboard'}`);

    const hasGlobal = hasPermission(request.user, 'ticket:view');

    // 1. Obtener poderes locales de la base de datos
    const { data: localPerms, error: permError } = await supabase
        .from('grupo_usuario_permisos')
        .select('grupo_id, permisos(nombre)')
        .eq('usuario_id', userId);

    if (permError) console.error("[GET /tickets] Error de BD al buscar permisos:", permError.message);

    // 2. Extraer los grupos donde el usuario sí puede ver tickets
    const gruposPermitidos = [];
    if (localPerms) {
        localPerms.forEach(lp => {
            const nombrePermiso = Array.isArray(lp.permisos) ? lp.permisos[0]?.nombre : lp.permisos?.nombre;
            if (nombrePermiso === 'ticket:view' || nombrePermiso === 'ticket:manage') {
                gruposPermitidos.push(lp.grupo_id);
            }
        });
    }

    console.log(`[GET /tickets] Poder Global: ${hasGlobal} | Grupos Permitidos Locales:`, gruposPermitidos);

    // 3. Evaluar Seguridad Estricta
    if (grupo_id) {
        if (!hasGlobal && !gruposPermitidos.includes(grupo_id)) {
            console.log(`[GET /tickets] BLOQUEADO 403: Intento de ver Kanban sin permiso.`);
            return reply.status(403).send({ message: 'Denegado: No tienes acceso a ver tickets en este grupo', data: [] });
        }
    } else {
        if (!hasGlobal && gruposPermitidos.length === 0) {
            console.log(`[GET /tickets] RETORNO VACÍO: El usuario no tiene acceso a ningún ticket.`);
            return reply.status(200).send({ statusCode: 200, data: [] });
        }
    }

    // 4. Construir Consulta
    let query = supabase.from('tickets').select(`
        *, estado:estados(nombre), prioridad:prioridades(nombre),
        autor:usuarios!tickets_autor_id_fkey(nombre_completo), asignado:usuarios!tickets_asignado_id_fkey(nombre_completo)
    `).order('creado_en', { ascending: false });

    if (grupo_id) query = query.eq('grupo_id', grupo_id);
    else if (!hasGlobal) query = query.in('grupo_id', gruposPermitidos);

    // 5. Devolver datos
    const { data, error } = await query;
    if (error) {
        console.error("[GET /tickets] Error BD en tickets:", error.message);
        return reply.status(500).send({ statusCode: 500, message: error.message, data: [] });
    }

    const ticketsPlanos = data.map(t => ({
        ...t,
        nombreEstado: t.estado?.nombre || null,
        nombrePrioridad: t.prioridad?.nombre || null,
        nombreAutor: t.autor?.nombre_completo || null,
        nombreAsignado: t.asignado?.nombre_completo || null
    }));

    console.log(`[GET /tickets] ÉXITO: Se enviaron ${ticketsPlanos.length} tickets al Frontend.\n`);
    return reply.status(200).send({ statusCode: 200, data: ticketsPlanos });
};

// 🟢 ASIGNAMOS LA MISMA LÓGICA A AMBAS RUTAS PARA BURLAR EL BUG DEL API GATEWAY
fastify.get('/', getTicketsHandler);
fastify.get('/api/tickets', getTicketsHandler); // <-- EL PARCHE MÁGICO

// 🟢 POST / -> Crear Ticket
fastify.post('/', async (request, reply) => {
    const { titulo, descripcion, grupo_id, asignado_id, estado_id, prioridad_id } = request.body;

    const hasGlobal = hasPermission(request.user, 'ticket:add');
    const hasLocal = await checkGroupPermission(request.user.userId, grupo_id, 'ticket:add');
    if (!hasGlobal && !hasLocal) return reply.status(403).send({ message: 'Denegado: No tienes permiso en este grupo' });

    const real_estado = await getIdPorNombre('estados', estado_id) || estado_id;
    const real_prioridad = await getIdPorNombre('prioridades', prioridad_id) || prioridad_id;

    const payload = {
        titulo, descripcion, grupo_id, autor_id: request.user.userId,
        estado_id: real_estado, prioridad_id: real_prioridad
    };
    if (asignado_id && asignado_id.length > 10) payload.asignado_id = asignado_id;

    const { data, error } = await supabase.from('tickets').insert([payload]).select();
    if (error) return reply.status(400).send({ message: error.message, data: [] });
    return reply.status(201).send({ data });
});

// 🟢 PUT /:id -> EDITAR TICKET
fastify.put('/:id', async (request, reply) => {
    const { id } = request.params;
    const { data: ticket } = await supabase.from('tickets').select('grupo_id').eq('id', id).single();

    // 1. ¿Tiene permiso para editar el ticket en general?
    const hasGlobal = hasPermission(request.user, 'ticket:edit');
    const hasLocal = await checkGroupPermission(request.user.userId, ticket.grupo_id, 'ticket:edit');
    if (!hasGlobal && !hasLocal) return reply.status(403).send({ message: 'Denegado' });

    // 2. ¿Tiene permiso ADICIONAL para mover el estado?
    const canMoveGlobal = hasPermission(request.user, 'ticket:edit:state');
    const canMoveLocal = await checkGroupPermission(request.user.userId, ticket.grupo_id, 'ticket:edit:state');
    const canMove = canMoveGlobal || canMoveLocal;

    const { titulo, descripcion, asignado_id, estado_id, prioridad_id } = request.body;

    // 3. Preparamos los datos SIN el estado
    const payload = {
        titulo,
        descripcion,
        prioridad_id: await getIdPorNombre('prioridades', prioridad_id) || prioridad_id
    };

    // 4. Si SÍ tiene poder para mover, le permitimos guardar el estado
    if (canMove && estado_id) {
        payload.estado_id = await getIdPorNombre('estados', estado_id) || estado_id;
    }

    if (asignado_id && asignado_id.length > 10) payload.asignado_id = asignado_id; else payload.asignado_id = null;

    const { data, error } = await supabase.from('tickets').update(payload).eq('id', id).select();
    if (error) return reply.status(400).send({ message: error.message, data: [] });
    return reply.status(200).send({ data });
});

// 🟢 PATCH /:id/state -> Mover Estado
fastify.patch('/:id/state', async (request, reply) => {
    const { id } = request.params;
    const { data: ticket } = await supabase.from('tickets').select('grupo_id').eq('id', id).single();

    const hasGlobal = hasPermission(request.user, 'ticket:edit:state');
    const hasLocal = await checkGroupPermission(request.user.userId, ticket.grupo_id, 'ticket:edit:state');
    if (!hasGlobal && !hasLocal) return reply.status(403).send({ message: 'Denegado' });

    const real_estado = await getIdPorNombre('estados', request.body.estado_id) || request.body.estado_id;
    const { data, error } = await supabase.from('tickets').update({ estado_id: real_estado }).eq('id', id).select();
    if (error) return reply.status(400).send({ message: error.message, data: [] });
    return reply.status(200).send({ data });
});

// 🟢 DELETE /:id
fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params;
    const { data: ticket } = await supabase.from('tickets').select('grupo_id').eq('id', id).single();

    const hasGlobal = hasPermission(request.user, 'ticket:delete');
    const hasLocal = await checkGroupPermission(request.user.userId, ticket.grupo_id, 'ticket:delete');
    if (!hasGlobal && !hasLocal) return reply.status(403).send({ message: 'Denegado' });

    await supabase.from('historial_tickets').delete().eq('ticket_id', id);
    await supabase.from('comentarios').delete().eq('ticket_id', id);
    const { data, error } = await supabase.from('tickets').delete().eq('id', id).select();
    if (error) return reply.status(400).send({ message: error.message, data: [] });
    return reply.status(200).send({ data });
});

// 🟢 GET /:id/comments -> Obtener comentarios
fastify.get('/:id/comments', async (request, reply) => {
    const { id } = request.params;
    const { data, error } = await supabase.from('comentarios').select('*, autor:usuarios!comentarios_autor_id_fkey(nombre_completo)').eq('ticket_id', id).order('creado_en', { ascending: true });

    if (error) return reply.status(500).send({ message: error.message, data: [] });

    // 🔴 TRADUCTOR: Transformamos 'contenido' de la BD a 'texto' para Angular
    const comentariosPlanos = data.map(c => ({
        ...c,
        texto: c.contenido, // <--- Aquí ocurre la magia
        nombreAutor: c.autor ? c.autor.nombre_completo : 'Desconocido'
    }));

    return reply.status(200).send({ data: comentariosPlanos });
});

// 🟢 POST /:id/comments -> Agregar un comentario
fastify.post('/:id/comments', async (request, reply) => {
    const { id } = request.params;
    const { data: ticket } = await supabase.from('tickets').select('grupo_id').eq('id', id).single();
    if (!ticket) return reply.status(404).send({ message: 'Ticket no encontrado' });

    const hasGlobal = hasPermission(request.user, 'ticket:edit:comment');
    const hasLocal = await checkGroupPermission(request.user.userId, ticket.grupo_id, 'ticket:edit:comment');
    if (!hasGlobal && !hasLocal) return reply.status(403).send({ message: 'Denegado' });

    const { texto } = request.body; // Angular nos manda 'texto'

    // 🔴 TRADUCTOR: Insertamos en la BD usando el nombre real de la columna ('contenido')
    const { data, error } = await supabase.from('comentarios').insert([{
        ticket_id: id,
        autor_id: request.user.userId,
        contenido: texto // <--- Aquí ocurre la magia
    }]).select();

    if (error) return reply.status(400).send({ message: error.message });
    return reply.status(201).send({ data });
});

fastify.listen({ port: 3002 }, (err, address) => {
    if (err) throw err;
    console.log(`🎫 Servicio de Tickets corriendo en ${address}`);
});