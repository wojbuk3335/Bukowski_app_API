const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// Połączenie do bazy danych
const connectDB = async () => {
    try {
        await mongoose.connect('mongodb://localhost:27017/Bukowski_db', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('MongoDB connected successfully');
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
};

// Schema użytkownika (podobna do tej w models/User.js)
const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    symbol: {
        type: String,
        required: true
    },
    sellingPoint: {
        type: String,
        required: true
    },
    isAdmin: {
        type: Boolean,
        default: false
    },
    role: {
        type: String,
        enum: ['user', 'admin', 'limited_admin'],
        default: 'user'
    }
}, {
    timestamps: true
});

const User = mongoose.model('User', userSchema);

const manageUsers = async () => {
    try {
        await connectDB();

        // 1. Usunięcie użytkownika LIMITED_ADMIN
        console.log('Szukanie użytkownika LIMITED_ADMIN...');
        const limitedAdminUser = await User.findOne({ 
            $or: [
                { role: 'limited_admin' },
                { name: { $regex: /LIMITED_ADMIN/i } },
                { email: { $regex: /LIMITED_ADMIN/i } }
            ]
        });

        if (limitedAdminUser) {
            console.log('Znaleziony użytkownik LIMITED_ADMIN:', limitedAdminUser);
            await User.deleteOne({ _id: limitedAdminUser._id });
            console.log('✅ Użytkownik LIMITED_ADMIN został usunięty');
        } else {
            console.log('ℹ️ Nie znaleziono użytkownika LIMITED_ADMIN');
        }

        // 2. Sprawdzenie czy Tomasz Cudzich już istnieje
        const existingTomasz = await User.findOne({
            $or: [
                { name: 'Tomasz Cudzich' },
                { email: 'tomasz.cudzich@bukowski.com' }
            ]
        });

        if (existingTomasz) {
            console.log('ℹ️ Użytkownik Tomasz Cudzich już istnieje:', existingTomasz);
        } else {
            // 3. Dodanie nowego użytkownika Tomasz Cudzich
            console.log('Dodawanie nowego użytkownika Tomasz Cudzich...');
            
            const hashedPassword = await bcrypt.hash('tomasz123', 10);
            
            const newUser = new User({
                email: 'tomasz.cudzich@bukowski.com',
                password: hashedPassword,
                name: 'Tomasz Cudzich',
                symbol: 'TC',
                sellingPoint: 'Kraków Galeria Krakowska',
                isAdmin: false,
                role: 'user'
            });

            await newUser.save();
            console.log('✅ Dodano nowego użytkownika Tomasz Cudzich');
            console.log('📧 Email: tomasz.cudzich@bukowski.com');
            console.log('🔑 Hasło: tomasz123');
            console.log('🏢 Punkt sprzedaży: Kraków Galeria Krakowska');
        }

        // 4. Wyświetlenie wszystkich użytkowników po zmianach
        console.log('\n📋 Lista wszystkich użytkowników po zmianach:');
        const allUsers = await User.find({}).select('name email role sellingPoint');
        allUsers.forEach((user, index) => {
            console.log(`${index + 1}. ${user.name} (${user.email}) - ${user.role} - ${user.sellingPoint}`);
        });

        mongoose.connection.close();
        console.log('\n✅ Operacja zakończona pomyślnie');

    } catch (error) {
        console.error('❌ Błąd podczas zarządzania użytkownikami:', error);
        mongoose.connection.close();
        process.exit(1);
    }
};

manageUsers();