const app = require('./app.js');
const { port } = require('./config');
const jacketsCoatsFursRoutes = require('./routes/jacketscoatsfurs');

app.use('/api/excel/category', jacketsCoatsFursRoutes);

// Start the server
app.listen(port, () => {
  console.log(`Server uruchomiony na porcie: ${port}`);
});
