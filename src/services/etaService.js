function toRadians(degrees) {
    return degrees * (Math.PI / 180);
}

function calculateDistanceKm(
    lat1,
    lon1,
    lat2,
    lon2
) {
    const earthRadiusKm = 6371;

    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(lat1)) *
        Math.cos(toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c =
        2 * Math.atan2(
            Math.sqrt(a),
            Math.sqrt(1 - a)
        );

    return earthRadiusKm * c;
}

function calculateETA(
    currentLat,
    currentLon,
    destinationLat,
    destinationLon,
    averageSpeedKph = 60
) {
    const distanceKm = calculateDistanceKm(
        currentLat,
        currentLon,
        destinationLat,
        destinationLon
    );

    const travelTimeHours =
        distanceKm / averageSpeedKph;

    const travelTimeMinutes =
        travelTimeHours * 60;

    const eta = new Date(
        Date.now() +
        travelTimeMinutes * 60 * 1000
    );

    return {
        distanceKm: Number(distanceKm.toFixed(2)),
        averageSpeedKph,
        travelTimeMinutes: Number(
            travelTimeMinutes.toFixed(1)
        ),
        eta: eta.toISOString()
    };
}

function calculateDelayMinutes(
    eta,
    scheduledDelivery
) {
    const etaTime = new Date(eta);
    const scheduledTime = new Date(
        scheduledDelivery
    );

    const delayMilliseconds =
        etaTime.getTime() -
        scheduledTime.getTime();

    const delayMinutes =
        delayMilliseconds / (1000 * 60);

    return Number(delayMinutes.toFixed(1));
}
function isProjectedLate(
    eta,
    scheduledDelivery,
    thresholdMinutes = 30
) {
    const delayMinutes = calculateDelayMinutes(
        eta,
        scheduledDelivery
    );

    return {
        delayMinutes,
        thresholdMinutes,
        isLate: delayMinutes >= thresholdMinutes
    };
}

module.exports = {
    calculateDistanceKm,
    calculateETA,
    calculateDelayMinutes,
    isProjectedLate
};