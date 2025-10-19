const jwt = require('jsonwebtoken');
const { jsonwebtoken } = require('../config');

// 🔒 MIDDLEWARE KONTROLI RÓL I UPRAWNIEŃ
const roleAuth = {
    
    // Sprawdza czy użytkownik ma określoną rolę
    requireRole: (allowedRoles) => {
        return (req, res, next) => {
            try {
                // Sprawdź czy istnieją dane użytkownika (po checkAuth)
                if (!req.userData) {
                    return res.status(401).json({
                        message: 'Brak danych autoryzacji. Użyj checkAuth middleware przed roleAuth.'
                    });
                }

                const userRole = req.userData.role || req.userData.userRole;
                
                if (!userRole) {
                    return res.status(403).json({
                        message: 'Nie znaleziono roli użytkownika w tokenie.'
                    });
                }

                // Sprawdź czy rola użytkownika jest na liście dozwolonych
                const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
                
                if (!rolesArray.includes(userRole)) {
                    console.warn(`🚫 ODMOWA DOSTĘPU: Użytkownik ${req.userData.email} (${userRole}) próbował uzyskać dostęp do ${req.method} ${req.originalUrl}`);
                    return res.status(403).json({
                        message: `Brak uprawnień. Wymagana rola: ${rolesArray.join(' lub ')}, twoja rola: ${userRole}`
                    });
                }

                console.log(`✅ DOSTĘP PRZYZNANY: ${req.userData.email} (${userRole}) -> ${req.method} ${req.originalUrl}`);
                next();
            } catch (error) {
                return res.status(500).json({
                    message: 'Błąd podczas sprawdzania uprawnień',
                    error: error.message
                });
            }
        };
    },

    // Tylko dla administratorów
    adminOnly: function() {
        return this.requireRole(['admin']);
    },

    // Tylko dla administratorów i magazynu
    adminOrMagazyn: function() {
        return this.requireRole(['admin', 'magazyn']);
    },

    // Dla administratorów, magazynu i domu
    privilegedUsers: function() {
        return this.requireRole(['admin', 'magazyn', 'dom']);
    },

    // Sprawdza czy użytkownik może operować na swoim punkcie sprzedaży
    ownSellingPointOnly: (req, res, next) => {
        try {
            const userSellingPoint = req.userData.sellingPoint;
            const requestedSellingPoint = req.body.sellingPoint || req.params.sellingPoint || req.query.sellingPoint;

            // Admin i magazyn mogą operować na wszystkich punktach
            if (['admin', 'magazyn'].includes(req.userData.role)) {
                return next();
            }

            // Użytkownicy mogą operować tylko na swoim punkcie
            if (requestedSellingPoint && requestedSellingPoint !== userSellingPoint) {
                return res.status(403).json({
                    message: `Możesz operować tylko na swoim punkcie sprzedaży: ${userSellingPoint}`
                });
            }

            next();
        } catch (error) {
            return res.status(500).json({
                message: 'Błąd podczas sprawdzania uprawnień do punktu sprzedaży',
                error: error.message
            });
        }
    }
};

module.exports = roleAuth;