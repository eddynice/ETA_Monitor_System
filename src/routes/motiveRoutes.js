const express = require("express");

const {
    getVehicleLocations,
    getDispatchLocation
} = require("../services/motiveService");

const {
    getAllVehicles
} = require("../services/vehicleService");

const {
    getDispatches,
    getRawDispatchPage,
    testDispatchFilters,
    getVehicleDispatches,
    getActiveDispatchDetails
} = require("../services/dispatchService");



const {
    calculateETA,
    isProjectedLate
} = require("../services/etaService");

const {
    sendTestEmail
} = require("../services/alertService");


const router = express.Router();


router.get("/vehicles", async (req, res) => {

    try {

        const data = await getVehicleLocations();

        res.json({
            success: true,
            data: data
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: "Failed to retrieve vehicles from Motive"
        });

    }

});


router.get("/vehicles/clean", async (req, res) => {

    try {

        const vehicles = await getAllVehicles();

        res.json({
            success: true,
            count: vehicles.length,
            vehicles: vehicles
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to retrieve vehicle data"
        });

    }

});

// router.get("/dispatches", async (req, res) => {

//     try {

//         const data = await getDispatches();

//         res.json({
//             success: true,
//             data: data
//         });

//     } catch (error) {

//         res.status(500).json({
//             success: false,
//             message: "Failed to retrieve dispatches from Motive"
//         });

//     }

// });
router.get("/dispatches/raw", async (req, res) => {
    try {
        const data = await getDispatches();

        const activeDispatch = data.rawDispatches?.find(
            item => item.dispatch?.status === "active"
        );

        res.json({
            success: true,
            dispatch: activeDispatch || null
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to retrieve raw dispatch"
        });
    }
});

router.get("/dispatch-location/:id", async (req, res) => {
    try {
        const location = await getDispatchLocation(req.params.id);

        res.json({
            success: true,
            data: location
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to retrieve dispatch location"
        });
    }
});


router.get("/eta/:dispatchId", async (req, res) => {
    try {
        const dispatchId = Number(req.params.dispatchId);

        const dispatchData = await getDispatches();

        const dispatch = dispatchData.dispatches.find(
            item => item.dispatchId === dispatchId
        );

        if (!dispatch) {
            return res.status(404).json({
                success: false,
                message: "Dispatch not found"
            });
        }

        if (!dispatch.vehicleId) {
            return res.status(400).json({
                success: false,
                message: "Dispatch has no assigned vehicle"
            });
        }

        const locationData =
            await getDispatchLocation(
                dispatch.deliveryLocationId
            );

        const destination =
            locationData.dispatch_locations?.[0]?.dispatch_location;

        if (!destination) {
            return res.status(404).json({
                success: false,
                message: "Delivery location not found"
            });
        }

        const vehicles = await getAllVehicles();

        const vehicle = vehicles.find(
            item =>
                Number(item.vehicleId) ===
                Number(dispatch.vehicleId)
        );

        if (!vehicle) {
            return res.status(404).json({
                success: false,
                message: "Vehicle location not found"
            });
        }

        const eta = calculateETA(
            vehicle.latitude,
            vehicle.longitude,
            destination.lat,
            destination.lon
        );

       const scheduledDelivery =
    dispatch.delivery.lateDate ||
    dispatch.delivery.earlyDate;

const delay = isProjectedLate(
    eta.eta,
    scheduledDelivery,
    30
);

        res.json({
            success: true,
            dispatch: {
                id: dispatch.dispatchId,
                vehicleId: dispatch.vehicleId
            },
            vehicle: {
                truckNumber: vehicle.truckNumber,
                latitude: vehicle.latitude,
                longitude: vehicle.longitude
            },
            destination: {
                name: destination.name,
                address: destination.address1,
                latitude: destination.lat,
                longitude: destination.lon
            },
            scheduledDelivery,

eta: eta.eta,

distanceKm: eta.distanceKm,

travelTimeMinutes:
    eta.travelTimeMinutes,

delayMinutes:
    delay.delayMinutes,

thresholdMinutes:
    delay.thresholdMinutes,

isLate:
    delay.isLate
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to calculate ETA",
            error: error.message
        });
    }
});
router.get("/test-email", async (req, res) => {

    try {

        const result =
            await sendTestEmail();

        res.json({
            success: result.success,
            message:
                result.success
                    ? "Test email sent successfully"
                    : result.message
        });

    } catch (error) {

        console.error(
            "Test email error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Failed to send test email"
        });
    }
});
router.get("/test-dispatches", async (req, res) => {
    try {
        const data = await getDispatches();

        res.json({
            success: true,
            count: data.dispatches.length,
            first10: data.dispatches.slice(0, 10),
            last10: data.dispatches.slice(-10)
        });

    } catch (error) {
        console.error("Test dispatch error:", error);

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});
router.get("/raw-dispatch-test", async (req, res) => {
    try {
        const data = await getRawDispatchPage(1);

        res.json({
            success: true,
            data
        });

    } catch (error) {
        console.error("Raw dispatch test error:", error);

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});
router.get("/test-dispatch-filters", async (req, res) => {
    try {
        const results =
            await testDispatchFilters();

        res.json({
            success: true,
            results
        });

    } catch (error) {
        console.error(
            "Dispatch filter test error:",
            error
        );

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

router.get("/vehicle-dispatches/:vehicleId", async (req, res) => {
    try {
        const vehicleId = req.params.vehicleId;

        const dispatches =
            await getVehicleDispatches(vehicleId);

        res.json({
            success: true,
            vehicleId,
            count: dispatches.length,
            dispatches
        });

    } catch (error) {
        console.error(
            "Vehicle dispatch lookup error:",
            error
        );

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

router.get("/dispatch-details/:dispatchId", async (req, res) => {
    try {
        const data =
            await getActiveDispatchDetails(
                req.params.dispatchId
            );

        res.json({
            success: true,
            data
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});
module.exports = router;