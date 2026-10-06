const {
    getVehicleLocations
} = require("./motiveService");


function formatVehicle(vehicleData) {

    const vehicle = vehicleData.vehicle;

    const location = vehicle.current_location;

    return {
        vehicleId: vehicle.id,
        truckNumber: vehicle.number,

        year: vehicle.year,
        make: vehicle.make,
        model: vehicle.model,

        vin: vehicle.vin,

        latitude: location.lat,
        longitude: location.lon,

        city: location.city,
        state: location.state,

        address: location.current_location,

        speedKph: location.kph,

        bearing: location.bearing,

        vehicleState: location.vehicle_state,

        locatedAt: location.located_at
    };
}


async function getAllVehicles() {

    const data = await getVehicleLocations();

    if (!data.vehicles) {
        return [];
    }

    return data.vehicles.map(formatVehicle);
}


module.exports = {
    getAllVehicles
};