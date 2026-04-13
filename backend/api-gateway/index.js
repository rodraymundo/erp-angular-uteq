import Fastify from 'fastify';
import proxy from '@fastify/http-proxy';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import dotenv from 'dotenv';
import cors from '@fastify/cors';

dotenv.config();
const fastify = Fastify({ logger: true });

// Habilitar CORS para que Angular (localhost:4200) pueda conectarse sin problemas
fastify.register(cors, {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
});

// 1. Límite de Peticiones (Requisito del profesor)
fastify.register(rateLimit, {
    max: 100, // 100 peticiones por minuto
    timeWindow: '1 minute',
    errorResponseBuilder: function (request, context) {
        return {
            statusCode: 429,
            intOpCode: 'API429',
            data: null,
            message: 'Demasiadas peticiones. Intenta más tarde.'
        };
    }
});

// 2. Configurar JWT
fastify.register(jwt, { secret: process.env.JWT_SECRET });

// 3. Middleware Hook para proteger rutas
fastify.addHook('onRequest', async (request, reply) => {
    // Dejamos pasar las rutas públicas de autenticación sin pedir token
    if (request.url.startsWith('/api/users/login') || request.url.startsWith('/api/users/register')) {
        return;
    }

    try {
        // Si la ruta no es pública, verificamos el token obligatoriamente
        await request.jwtVerify();

        // Log para puntos extra
        console.log(`[API GATEWAY LOG] Usuario ID: ${request.user.userId} accedió a ${request.url}`);
    } catch (err) {
        return reply.status(401).send({
            statusCode: 401,
            intOpCode: 'Auth401',
            data: null,
            message: 'Token inválido o expirado'
        });
    }
});

// =========================================================================
// 4. PROXYS: Redirección a los Microservicios correspondientes
// =========================================================================

// A) Servicio de Usuarios (Puerto 3001)
fastify.register(proxy, {
    upstream: process.env.USER_SERVICE_URL || 'http://localhost:3001',
    prefix: '/api/users',
    rewritePrefix: '/users' // Al servicio de usuarios le llegará como /users/...
});

// B) Servicio de Tickets (Puerto 3002) - ¡AQUÍ ESTÁ EL QUE FALTABA!
fastify.register(proxy, {
    upstream: process.env.TICKET_SERVICE_URL || 'http://localhost:3002',
    prefix: '/api/tickets',
    rewritePrefix: '/' // Se elimina /api/tickets para que el servicio reciba la raíz /
});

// C) Servicio de Grupos (Puerto 3003) - Lo dejamos listo de una vez
fastify.register(proxy, {
    upstream: process.env.GROUP_SERVICE_URL || 'http://localhost:3003',
    prefix: '/api/groups',
    rewritePrefix: '/'
});

// Levantar el Gateway
fastify.listen({ port: 3000 }, (err, address) => {
    if (err) throw err;
    console.log(`🚀 API Gateway corriendo en ${address}`);
});