const Fastify = require('fastify');
const fastify = Fastify({ logger: true });

// Validación estricta JSON SCHEMA de respuesta (Requisito)
const responseSchema = {
    response: {
        200: {
            type: 'object',
            properties: {
                statusCode: { type: 'integer' },
                intOpCode: { type: 'string' },
                data: { type: 'array' } // Arreglo genérico para devolver datos
            }
        }
    }
};

// Endpoint GET tickets
fastify.get('/', { schema: responseSchema }, async (request, reply) => {
    // Lógica de BD (Supabase) iría aquí...
    const tickets = [{ id: 'T-01', title: 'Ajustar BD', status: 'TODO' }];

    return reply.status(200).send({
        statusCode: 200,
        intOpCode: 'TCK200', // Código de operación interno
        data: tickets
    });
});

fastify.listen({ port: 3002 }, (err, address) => {
    if (err) throw err;
    console.log(`Servicio Tickets en el puerto 3002`);
});