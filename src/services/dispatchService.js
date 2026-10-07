const axios = require("axios");

const motiveAPI = axios.create({
    baseURL: process.env.MOTIVE_BASE_URL,
    headers: {
        "X-API-Key": process.env.MOTIVE_API_KEY,
        "Accept": "application/json"
    }
});

function formatDispatch(item) {
    const dispatch = item.dispatch;

    const trip =
        dispatch?.dispatch_trips?.[0]?.dispatch_trip;

    const stops =
        dispatch?.dispatch_stops
            ?.map(item => item.dispatch_stop)
            .filter(Boolean) || [];

   const pickupStops =
    stops.filter(
        stop =>
            String(stop.type).toLowerCase() ===
            "pickup"
    );

const deliveryStops =
    stops.filter(
        stop =>
            String(stop.type).toLowerCase() ===
            "delivery"
    );

    const pickup =
        pickupStops[pickupStops.length - 1] || null;

    const delivery =
        deliveryStops[deliveryStops.length - 1] || null;

    return {
        dispatchId: dispatch?.id || null,
        status: dispatch?.status || null,

        vehicleId: trip?.vehicle_id || null,
        tripStatus: trip?.status || null,

        pickupNumber:
            dispatch?.pickup_number ||
            pickup?.comments ||
            null,

        loadedMiles:
            dispatch?.loaded_miles ||
            trip?.loaded_miles ||
            null,

        pickup: {
            locationId:
                pickup?.dispatch_location_id ||
                null,

            earlyDate:
                pickup?.early_date ||
                null,

            lateDate:
                pickup?.late_date ||
                null,

            status:
                pickup?.status ||
                null
        },

        delivery: {
            locationId:
                delivery?.dispatch_location_id ||
                null,

            earlyDate:
                delivery?.early_date ||
                null,

            lateDate:
                delivery?.late_date ||
                null,

            status:
                delivery?.status ||
                null
        },

        stops: stops.map(stop => ({
            id: stop.id,
            locationId: stop.dispatch_location_id,
            type: stop.type,
            earlyDate: stop.early_date,
            lateDate: stop.late_date,
            status: stop.status
        }))
    };
}

// async function getDispatches(startDate = "2026-10-01T00:00:00Z") {
//     try {
//         const perPage = 100;
//         const maxPages = 5;

//         let allDispatches = [];

//         for (let pageNo = 1; pageNo <= maxPages; pageNo++) {
//             console.log(`Fetching dispatch page ${pageNo}...`);

//             let response;

//             for (let attempt = 1; attempt <= 3; attempt++) {
//                 try {
//                     response = await motiveAPI.get("/v2/dispatches", {
//                         params: {
//                             per_page: perPage,
//                             page_no: pageNo,
//                             status: "active"
//                         },
//                         timeout: 15000
//                     });

//                     break;

//                 } catch (error) {
//                     console.error(
//                         `Dispatch page ${pageNo} attempt ${attempt} failed:`,
//                         error.message
//                     );

//                     if (attempt === 3) {
//                         throw error;
//                     }

//                     await new Promise(resolve =>
//                         setTimeout(resolve, 2000)
//                     );
//                 }
//             }

//             const dispatches =
//                 response.data.dispatches || [];

//             allDispatches =
//                 allDispatches.concat(dispatches);

//             if (dispatches.length < perPage) {
//                 break;
//             }
//         }

//         console.log(
//             `Dispatches retrieved: ${allDispatches.length}`
//         );

//         const filteredDispatches =
//             allDispatches.filter(item => {
//                 const dispatch = item.dispatch;

//                 if (!dispatch?.pickup_early_date) {
//                     return false;
//                 }

//                 return (
//                     new Date(dispatch.pickup_early_date) >=
//                     new Date(startDate)
//                 );
//             });

//         console.log(
//             `Dispatches from ${startDate}: ${filteredDispatches.length}`
//         );

//         const formattedDispatches =
//             filteredDispatches.map(formatDispatch);

//         return {
//             dispatches: formattedDispatches,
//             rawDispatches: filteredDispatches,

//             pagination: {
//                 total_retrieved: allDispatches.length,
//                 filtered_count:
//                     formattedDispatches.length
//             },

//             filter_start_date: startDate
//         };

//     } catch (error) {
//         console.error(
//             "Dispatch API Error:",
//             error.response?.status,
//             error.response?.data || error.message
//         );

//         throw error;
//     }
// }
async function getDispatches() {
    try {
        const perPage = 100;
        let pageNo = 1;
        let allDispatches = [];

        while (true) {
            console.log(`Fetching active dispatch page ${pageNo}...`);

            let response;

            for (let attempt = 1; attempt <= 3; attempt++) {
                try {
                    response = await motiveAPI.get("/v3/dispatches", {
                        params: {
                            "statuses[]": "active",
                            per_page: perPage,
                            page_no: pageNo
                        },
                        timeout: 15000
                    });

                    break;

                } catch (error) {
                    console.error(
                        `Dispatch page ${pageNo} attempt ${attempt} failed:`,
                        error.message
                    );

                    if (attempt === 3) {
                        throw error;
                    }

                    await new Promise(resolve =>
                        setTimeout(resolve, 2000)
                    );
                }
            }

            const dispatches =
                response.data.dispatches || [];
                if (pageNo === 1 && dispatches.length > 0) {
    // console.log(
    //     "RAW ACTIVE DISPATCH:",
    //     JSON.stringify(dispatches[0], null, 2)
    // );
}
            allDispatches =
                allDispatches.concat(dispatches);

            if (dispatches.length < perPage) {
                break;
            }

            pageNo++;
        }

        console.log(
            `Active dispatches retrieved: ${allDispatches.length}`
        );

        const formattedDispatches =
            allDispatches.map(formatDispatch);

            const now = new Date();

const currentDispatches =
    formattedDispatches.filter(dispatch => {

        const deliveryDate =
            dispatch.delivery.lateDate ||
            dispatch.delivery.earlyDate;

        if (!deliveryDate) {
            return false;
        }

        const deliveryTime =
            new Date(deliveryDate);

        // Ignore dispatches whose delivery date
        // is more than 24 hours in the past.
        const oneDayAgo =
            new Date(
                now.getTime() -
                24 * 60 * 60 * 1000
            );

        return deliveryTime >= oneDayAgo;
    });
            console.log(
    "Active dispatch vehicle IDs:",
    formattedDispatches.map(dispatch => ({
        dispatchId: dispatch.dispatchId,
        status: dispatch.status,
        vehicleId: dispatch.vehicleId,
        tripStatus: dispatch.tripStatus
    }))
);

        return {
            dispatches: currentDispatches,
            //dispatches: formattedDispatches,
            rawDispatches: allDispatches,
            pagination: {
                total_retrieved: allDispatches.length,
                filtered_count: currentDispatches.length
               // filtered_count: formattedDispatches.length
            }
        };

    } catch (error) {
        console.error(
            "Dispatch API Error:",
            error.response?.status,
            error.response?.data || error.message
        );

        throw error;
    }
}

async function getRawDispatchPage(pageNo = 1) {
    try {
        const response = await motiveAPI.get("/v2/dispatches", {
            params: {
                per_page: 10,
                page_no: pageNo
            },
            timeout: 15000
        });

        return response.data;

    } catch (error) {
        console.error(
            "Raw dispatch request failed:",
            error.response?.status,
            error.response?.data || error.message
        );

        throw error;
    }
}

async function testDispatchFilters() {
    const tests = [
        {
            name: "no_filter",
            params: {
                per_page: 10,
                page_no: 1
            }
        },
        {
            name: "statuses_active",
            params: {
                per_page: 10,
                page_no: 1,
                "statuses[]": "active"
            }
        },
        {
            name: "min_updated_at",
            params: {
                per_page: 10,
                page_no: 1,
                min_updated_at: "2026-10-01T00:00:00Z"
            }
        }
    ];

    const results = [];

    for (const test of tests) {
        try {
            console.log(
                `Testing dispatch filter: ${test.name}`
            );

            const response = await motiveAPI.get(
                "/v3/dispatches",
                {
                    params: test.params,
                    timeout: 15000
                }
            );

            const dispatches =
                response.data.dispatches || [];

            results.push({
                name: test.name,
                count: dispatches.length,
                firstDispatch:
                    dispatches[0]?.dispatch
                        ? {
                            id: dispatches[0].dispatch.id,
                            status: dispatches[0].dispatch.status,
                            pickupEarlyDate:
                                dispatches[0].dispatch.pickup_early_date,
                            deliveryEarlyDate:
                                dispatches[0].dispatch.delivery_early_date,
                            statusUpdatedAt:
                                dispatches[0].dispatch.status_updated_at
                        }
                        : null
            });

        } catch (error) {
            results.push({
                name: test.name,
                error:
                    error.response?.data ||
                    error.message
            });
        }
    }

    return results;
}
async function getVehicleDispatches(vehicleId) {
    const data = await getDispatches();

    return data.dispatches.filter(
        dispatch =>
            Number(dispatch.vehicleId) === Number(vehicleId)
    );
}
async function getActiveDispatchDetails(dispatchId) {
    try {
        const response = await motiveAPI.get(
            `/v3/dispatches/${dispatchId}`,
            {
                timeout: 15000
            }
        );

        console.log(
            "FULL DISPATCH DETAILS:",
            JSON.stringify(response.data, null, 2)
        );

        return response.data;

    } catch (error) {
        console.error(
            "Dispatch detail error:",
            error.response?.status,
            error.response?.data || error.message
        );

        throw error;
    }
}
module.exports = {
    getDispatches,
    getRawDispatchPage,
    testDispatchFilters,
    getVehicleDispatches,
    getActiveDispatchDetails,
    formatDispatch
};