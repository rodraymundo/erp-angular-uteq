import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    // Extraemos el token que guardaste en el Login
    const token = localStorage.getItem('auth_token');

    // Si hay token, clonamos la petición y le inyectamos el encabezado de Autorización
    if (token) {
        const authReq = req.clone({
            headers: req.headers.set('Authorization', `Bearer ${token}`)
        });
        return next(authReq); // Pasamos la petición modificada
    }

    // Si no hay token, dejamos que la petición siga normal
    return next(req);
};