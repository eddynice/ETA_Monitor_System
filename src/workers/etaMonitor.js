const {
    getDispatches
} = require("../services/dispatchService");

const {
    getAllVehicles
} = require("../services/vehicleService");

const {
    getDispatchLocation
} = require("../services/motiveService");

const {
    calculateETA,
    isProjectedLate
} = require("../services/etaService");
const {
    createAlert,
    shouldSendLateAlert,
    saveAlert,
    clearAlert,
    //sendTeamsAlert
    sendEmailAlert
} = require("../services/alertService");

const CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

const ALERT_THRESHOLD_MINUTES = 30;

async function checkDispatches() {
    console.log("=================================");
    console.log("Starting ETA monitoring check...");
    console.log(new Date().toISOString());

    try {
        // 1. Get dispatches
        const dispatchData = await getDispatches();

        const dispatches = dispatchData.dispatches || [];

        // 2. Only monitor active/in-progress dispatches
        const activeDispatches = dispatches.filter(dispatch =>
            dispatch.status === "active" &&
            dispatch.vehicleId
        );

        console.log(
            `Active dispatches with vehicles: ${activeDispatches.length}`
        );

        if (activeDispatches.length === 0) {
            console.log("No active dispatches to monitor.");
            return;
        }

        // 3. Get all vehicle locations once
        const vehicles = await getAllVehicles();

        console.log(
            `Vehicles received from Motive: ${vehicles.length}`
        );

        // 4. Check every dispatch
        for (const dispatch of activeDispatches) {
            try {
                await monitorDispatch(
                    dispatch,
                    vehicles
                );
            } catch (error) {
                console.error(
                    `Failed to monitor dispatch ${dispatch.dispatchId}:`,
                    error.message
                );
            }
        }

    } catch (error) {
        console.error(
            "ETA monitoring failed:",
            error.message
        );
    }

    console.log("ETA monitoring check completed.");
}

async function monitorDispatch(
    dispatch,
    vehicles
) {
    // Find vehicle assigned to dispatch
    const vehicle = vehicles.find(
        item =>
            Number(item.vehicleId) ===
            Number(dispatch.vehicleId)
    );

    if (!vehicle) {
        console.log(
            `Vehicle ${dispatch.vehicleId} not found for dispatch ${dispatch.dispatchId}`
        );

        return;
    }

    // Get delivery location
  const deliveryLocationId =
    dispatch.delivery?.locationId;

if (!deliveryLocationId) {
    console.log(
        `No delivery location for dispatch ${dispatch.dispatchId}`
    );
    return;
}
  const locationData =
    await getDispatchLocation(
        deliveryLocationId
    );
    console.log(
    "LOCATION DATA:",
    JSON.stringify(locationData, null, 2)
);

    const destination =
    locationData.data?.dispatch_locations?.[0]?.dispatch_location;

    if (!destination) {
        console.log(
            `Destination not found for dispatch ${dispatch.dispatchId}`
        );

        return;
    }

    // Calculate ETA
    const eta = calculateETA(
        vehicle.latitude,
        vehicle.longitude,
        destination.lat,
        destination.lon
    );

    // Use delivery late date as the deadline
    const scheduledDelivery =
        dispatch.delivery.lateDate ||
        dispatch.delivery.earlyDate;

    if (!scheduledDelivery) {
        console.log(
            `No delivery deadline for dispatch ${dispatch.dispatchId}`
        );

        return;
    }

    // Check projected delay
    const delay = isProjectedLate(
        eta.eta,
        scheduledDelivery,
        ALERT_THRESHOLD_MINUTES
    );

    console.log("---------------------------------");
    console.log(
        `Dispatch: ${dispatch.dispatchId}`
    );
    console.log(
        `Truck: ${vehicle.truckNumber}`
    );
    console.log(
        `Destination: ${destination.name}`
    );
    console.log(
        `Distance: ${eta.distanceKm} km`
    );
    console.log(
        `ETA: ${eta.eta}`
    );
    console.log(
        `Deadline: ${scheduledDelivery}`
    );
    console.log(
        `Projected delay: ${delay.delayMinutes} minutes`
    );
    console.log(
        `Late: ${delay.isLate}`
    );

  if (delay.isLate) {

    if (
        shouldSendLateAlert(
            dispatch.dispatchId
        )
    ) {

        const alert = createAlert({
            dispatchId: dispatch.dispatchId,
            vehicleId: dispatch.vehicleId,
            truckNumber: vehicle.truckNumber,
            destination: destination.name,
            eta: eta.eta,
            scheduledDelivery,
            delayMinutes: delay.delayMinutes
        });

        saveAlert(alert);

        console.log(
            "🚨 NEW LATE ALERT"
        );

        console.log(
            JSON.stringify(
                alert,
                null,
                2
            )
        );

        const notification =
            await sendEmailAlert(alert);

        if (!notification.success) {
            console.error(
                `Failed to notify dispatch for ${dispatch.dispatchId}`
            );
        }

    } else {

        console.log(
            `Alert already exists for dispatch ${dispatch.dispatchId}`
        );
    }

} else {

    clearAlert(
        dispatch.dispatchId
    );

    console.log(
        `Dispatch ${dispatch.dispatchId} is currently on time.`
    );
}
}

function startEtaMonitor() {
    console.log(
        "ETA Monitor started."
    );

    // Run immediately
    checkDispatches();

    // Continue every 5 minutes
    setInterval(
        checkDispatches,
        CHECK_INTERVAL
    );
}

module.exports = {
    checkDispatches,
    startEtaMonitor
};