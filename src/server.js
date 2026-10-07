require("dotenv").config();

const express = require("express");
const cors = require("cors");
const motiveRoutes = require("./routes/motiveRoutes");
const {startEtaMonitor} = require("./workers/etaMonitor");
const {testEmailConnection} = require("./services/alertService");

const app = express();
    
app.use(cors());
app.use(express.json());
app.use("/motive", motiveRoutes);

app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "Fortecho ETA Monitoring System is running"
    });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
      testEmailConnection();
      startEtaMonitor();
});

