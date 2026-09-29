process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'secreto-de-pruebas-con-mas-de-32-caracteres!!';
process.env.BCRYPT_ROUNDS = '4'; // rondas bajas solo para acelerar las pruebas
