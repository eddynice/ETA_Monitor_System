const nodemailer = require("nodemailer");

const { pool } = require("../config/database");

const emailTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 465),
    secure: process.env.SMTP_SECURE === "true",

    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
    }
});


function createAlert({
    dispatchId,
    vehicleId,
    truckNumber,
    destination,
    eta,
    scheduledDelivery,
    delayMinutes
}) {
    return {
        dispatchId,
        vehicleId,
        truckNumber,
        destination,
        eta,
        scheduledDelivery,
        delayMinutes,
        createdAt: new Date().toISOString()
    };
}


/*
 * Check MySQL to determine whether this dispatch
 * already has an active alert.
 */
async function shouldSendLateAlert(dispatchId) {
    try {
        const [rows] = await pool.execute(
            `
            SELECT id
            FROM alerts
            WHERE dispatch_id = ?
              AND status = 'active'
            LIMIT 1
            `,
            [dispatchId]
        );

        return rows.length === 0;

    } catch (error) {

        console.error(
            "Failed to check existing alert:",
            error.message
        );

        throw error;
    }
}


/*
 * Save a new alert to MySQL.
 */
async function  saveAlert(alert) {
    try {

        const [result] = await pool.execute(
            `
            INSERT INTO alerts (
                dispatch_id,
                vehicle_id,
                truck_number,
                destination,
                eta,
                scheduled_delivery,
                delay_minutes,
                status,
                created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, 'active', NOW())
            `,
            [
                alert.dispatchId,
                alert.vehicleId,
                alert.truckNumber,
                alert.destination,
                alert.eta,
                alert.scheduledDelivery,
                alert.delayMinutes
            ]
        );

        console.log(
            `Alert saved to database. Alert ID: ${result.insertId}`
        );

        return {
            success: true,
            id: result.insertId
        };

    } catch (error) {

        /*
         * Duplicate active alert protection.
         */
        if (error.code === "ER_DUP_ENTRY") {

            console.log(
                `Active alert already exists for dispatch ${alert.dispatchId}`
            );

            return {
                success: false,
                duplicate: true
            };
        }

        console.error(
            "Failed to save alert:",
            error.message
        );

        throw error;
    }
}


/*
 * Get the currently active alert
 * for a dispatch.
 */
async function getAlert(dispatchId) {
    try {

        const [rows] = await pool.execute(
            `
            SELECT *
            FROM alerts
            WHERE dispatch_id = ?
              AND status = 'active'
            ORDER BY created_at DESC
            LIMIT 1
            `,
            [dispatchId]
        );

        return rows[0] || null;

    } catch (error) {

        console.error(
            "Failed to retrieve alert:",
            error.message
        );

        throw error;
    }
}


/*
 * Resolve an active alert when the truck
 * is no longer projected to be 30+ minutes late.
 */
async function clearAlert(dispatchId) {
    try {

        const [result] = await pool.execute(
            `
            UPDATE alerts
            SET
                status = 'resolved',
                resolved_at = NOW()
            WHERE dispatch_id = ?
              AND status = 'active'
            `,
            [dispatchId]
        );

        if (result.affectedRows > 0) {

            console.log(
                `Alert resolved for dispatch ${dispatchId}`
            );
        }

        return {
            success: true,
            resolved: result.affectedRows > 0
        };

    } catch (error) {

        console.error(
            "Failed to resolve alert:",
            error.message
        );

        throw error;
    }
}


/*
 * Get all currently active alerts.
 */
async function getActiveAlerts() {
    try {

        const [rows] = await pool.execute(
            `
            SELECT *
            FROM alerts
            WHERE status = 'active'
            ORDER BY created_at DESC
            `
        );

        return rows;

    } catch (error) {

        console.error(
            "Failed to retrieve active alerts:",
            error.message
        );

        throw error;
    }
}


/*
 * Send email notification.
 */
async function sendEmailAlert(alert) {

    if (
        !process.env.SMTP_USER ||
        !process.env.SMTP_PASSWORD ||
        !process.env.ALERT_EMAIL
    ) {
        console.error(
            "Email configuration is incomplete."
        );

        return {
            success: false,
            message: "Email configuration incomplete"
        };
    }

    const mail = {
        from: `"Fortecho ETA Monitor" <${process.env.SMTP_USER}>`,
        to: process.env.ALERT_EMAIL,

        subject:
            `🚨 ETA Alert - Truck ${alert.truckNumber} - Dispatch ${alert.dispatchId}`,

        text:
            `FORTECHO ETA ALERT\n\n` +
            `Dispatch: ${alert.dispatchId}\n` +
            `Truck: ${alert.truckNumber}\n` +
            `Vehicle ID: ${alert.vehicleId}\n` +
            `Destination: ${alert.destination}\n\n` +
            `Projected ETA: ${alert.eta}\n` +
            `Scheduled Delivery: ${alert.scheduledDelivery}\n` +
            `Projected Delay: ${alert.delayMinutes} minutes\n\n` +
            `Please review the load and take the necessary dispatch action.\n\n` +
            `Generated by Fortecho ETA Monitoring System.`,

        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px;">

                <h2 style="color: #d93025;">
                    🚨 Fortecho ETA Alert
                </h2>

                <p>
                    A truck is projected to arrive
                    <strong>${alert.delayMinutes} minutes late.</strong>
                </p>

                <table style="border-collapse: collapse; width: 100%;">

                    <tr>
                        <td style="padding: 8px; border: 1px solid #ddd;">
                            <strong>Dispatch</strong>
                        </td>
                        <td style="padding: 8px; border: 1px solid #ddd;">
                            ${alert.dispatchId}
                        </td>
                    </tr>

                    <tr>
                        <td style="padding: 8px; border: 1px solid #ddd;">
                            <strong>Truck</strong>
                        </td>
                        <td style="padding: 8px; border: 1px solid #ddd;">
                            ${alert.truckNumber}
                        </td>
                    </tr>

                    <tr>
                        <td style="padding: 8px; border: 1px solid #ddd;">
                            <strong>Destination</strong>
                        </td>
                        <td style="padding: 8px; border: 1px solid #ddd;">
                            ${alert.destination}
                        </td>
                    </tr>

                    <tr>
                        <td style="padding: 8px; border: 1px solid #ddd;">
                            <strong>Projected ETA</strong>
                        </td>
                        <td style="padding: 8px; border: 1px solid #ddd;">
                            ${alert.eta}
                        </td>
                    </tr>

                    <tr>
                        <td style="padding: 8px; border: 1px solid #ddd;">
                            <strong>Scheduled Delivery</strong>
                        </td>
                        <td style="padding: 8px; border: 1px solid #ddd;">
                            ${alert.scheduledDelivery}
                        </td>
                    </tr>

                    <tr>
                        <td style="padding: 8px; border: 1px solid #ddd;">
                            <strong>Projected Delay</strong>
                        </td>
                        <td style="padding: 8px; border: 1px solid #ddd;">
                            <strong>
                                ${alert.delayMinutes} minutes
                            </strong>
                        </td>
                    </tr>

                </table>

                <p style="margin-top: 20px;">
                    Please review the load and take the necessary
                    dispatch action.
                </p>

                <hr>

                <p style="font-size: 12px; color: #777;">
                    Generated automatically by Fortecho ETA Monitoring System.
                </p>

            </div>
        `
    };

    try {

        await emailTransporter.sendMail(mail);

        console.log(
            `Email alert sent for dispatch ${alert.dispatchId}`
        );

        return {
            success: true
        };

    } catch (error) {

        console.error(
            "Email alert failed:",
            error.message
        );

        return {
            success: false,
            message: error.message
        };
    }
}


async function testEmailConnection() {
    try {

        await emailTransporter.verify();

        console.log(
            "Email SMTP connection successful."
        );

        return true;

    } catch (error) {

        console.error(
            "Email SMTP connection failed:",
            error.message
        );

        return false;
    }
}


async function sendTestEmail() {

    const testAlert = {
        dispatchId: "TEST-15242930",
        vehicleId: 1171253,
        truckNumber: "5204",
        destination: "FAIRFIELD SERVICE COMPANY OF INDIANA LLC",
        eta: new Date(
            Date.now() + 60 * 60 * 1000
        ).toISOString(),
        scheduledDelivery: new Date(
            Date.now() + 30 * 60 * 1000
        ).toISOString(),
        delayMinutes: 30
    };

    return await sendEmailAlert(testAlert);
}


module.exports = {
    createAlert,
    shouldSendLateAlert,
    saveAlert,
    getAlert,
    clearAlert,
    getActiveAlerts,
    sendEmailAlert,
    sendTestEmail,
    testEmailConnection
};