const app = require('./app.js');
const { port } = require('./config');


// Start the server
app.listen(port, () => {
  console.log(`Server uruchomiony na porcie: ${port}`);
});
