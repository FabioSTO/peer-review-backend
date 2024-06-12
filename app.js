// app.js
const app = require("./server");
const userRoutes = require("./routes/userRoutes");
const organizationRoutes = require("./routes/organizationRoutes");
const projectRoutes = require("./routes/projectRoutes");
const taskRoutes = require("./routes/taskRoutes");
const gitMembersRoutes = require("./routes/gitMembersRoutes");

app.use("/users", userRoutes);
app.use("/organizations", organizationRoutes);
app.use("/projects", projectRoutes);
app.use("/tasks", taskRoutes);
app.use("/gitMembers", gitMembersRoutes);

app.get("/status", (request, response) => {
  const status = {
    Status: "Running",
  };
  response.send(status);
});