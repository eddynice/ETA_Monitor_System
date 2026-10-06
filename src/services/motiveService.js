const axios = require("axios");

const motiveAPI = axios.create({
    baseURL: process.env.MOTIVE_BASE_URL,
    headers: {
        "X-API-Key": process.env.MOTIVE_API_KEY,
        "Accept": "application/json"
    }
});

async function getVehicleLocations() {
    try {

        const response = await motiveAPI.get("/v3/vehicle_locations", {
            params: {
                per_page: 100,
                page_no: 1
            }
        });

        return response.data;

    } catch (error) {

        console.error("STATUS:", error.response?.status);

        console.error(
            "MOTIVE ERROR:",
            error.response?.data || error.message
        );

        throw error;
    }
}
async function getDispatchLocation(locationId) {
    try {
        const response = await motiveAPI.get("/v1/dispatch_locations", {
            params: {
                "ids[]": locationId
            }
        });

        return response.data;
    } catch (error) {
        console.error(
            "Dispatch Location API Error:",
            error.response?.status,
            error.response?.data || error.message
        );

        throw error;
    }
}

module.exports = {
    getVehicleLocations,
    getDispatchLocation
};