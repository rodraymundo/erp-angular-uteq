require('dotenv').config();
const Fastify = require('fastify');
const proxy = require('@fastify/http-proxy');
const jwt = require('@fastify/jwt');
const rateLimit = require('@fastify/rate-limit');

const fastify = Fastify({ logger: true });

// 1. Límite de peticiones (Requerimiento del profe: 100/min)
fastify.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    errorResponseBuilder: function (request, context) {
        return { statusCode: 429, intOpCode: 'API429', data: null, message: 'Límite de peticiones excedido' };
    }
});

// 2. Configurar JWT
fastify.register(jwt, { secret: process.env.JWT_SECRET });

// 3. Protección de Rutas y Logs
fastify.addHook('onRequest', async (request, reply) => {
    // Dejar pasar login y registro sin token
    if (request.url.includes('/login') || request.url.includes('/register')) {
        return;
    }

    try {
        await request.jwtVerify(); // Valida el token
        const userPerms = request.user.permissions || [];

        // Validar permiso de editar/mover ticket
        if (request.method === 'PATCH' && request.url.includes('/status') && !userPerms.includes('tickets:move')) {
            return reply.status(403).send({ statusCode: 403, intOpCode: 'SEC403', data: null, message: 'No tienes permiso tickets:move' });
        }

        // Guardar Logs (Requisito de 20% puntos extra)
        console.log(`[LOG] Ruta: ${request.url} | Método: ${request.method} | IP: ${request.ip}`);
    } catch (err) {
        return reply.status(401).send({ statusCode: 401, intOpCode: 'SEC401', data: null, message: 'No autorizado / Token inválido' });
    }
});

// 4. Configurar el Proxy hacia los Microservicios
fastify.register(proxy, { upstream: process.env.USER_SERVICE_URL, prefix: '/api/users' });
fastify.register(proxy, { upstream: process.env.TICKET_SERVICE_URL, prefix: '/api/tickets' });
fastify.register(proxy, { upstream: process.env.GROUP_SERVICE_URL, prefix: '/api/groups' });

fastify.listen({ port: process.env.PORT }, (err, address) => {
    if (err) throw err;
    console.log(`API Gateway escuchando en ${address}`);
});