// app.js
const app = require("./server");
const userRoutes = require("./userRoutes");

app.use("/users", userRoutes);

app.get("/status", (request, response) => {
  const status = {
    Status: "Running",
  };
  response.send(status);
});