const { google } = require('googleapis');

// Configuración
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const SHEET_NAME = process.env.SHEET_NAME || 'Entradas confirmadas';
const CONTROL_SHEET_NAME = process.env.CONTROL_SHEET_NAME || 'CONTROL';

const COLUMNS = {
    TICKET_ID: 0,
    ORDER_ID: 1,
    EVENTO: 2,
    FASE: 3,
    NOMBRE: 4,
    EMAIL: 5,
    QR_CODE_COMPRA: 6,
    CODIGO_DESCUENTO: 7,
    TICKET_USADO: 8,
    FECHA_USO: 9
};

function getAuthClient() {
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
    return new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
}

async function getControlCounts(sheets) {
    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${CONTROL_SHEET_NAME}!A1:B2`,
    });

    const rows = response.data.values || [];
    const countsRow = rows[1] || [];
    const satisfactory = parseInt(countsRow[0], 10);
    const unsatisfactory = parseInt(countsRow[1], 10);

    return {
        satisfactorio: Number.isNaN(satisfactory) ? 0 : satisfactory,
        insatisfactorio: Number.isNaN(unsatisfactory) ? 0 : unsatisfactory,
    };
}

async function updateControlCounts(sheets, isValid) {
    const counts = await getControlCounts(sheets);

    const updatedCounts = {
        satisfactorio: counts.satisfactorio + (isValid ? 1 : 0),
        insatisfactorio: counts.insatisfactorio + (isValid ? 0 : 1),
    };

    await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${CONTROL_SHEET_NAME}!A2:B2`,
        valueInputOption: 'RAW',
        resource: { values: [[updatedCounts.satisfactorio, updatedCounts.insatisfactorio]] },
    });

    return updatedCounts;
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (!SPREADSHEET_ID || !process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
        return res.status(500).json({
            success: false,
            message: 'Error de configuración del servidor',
            error: 'Variables de entorno no configuradas',
        });
    }

    const auth = getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });

    if (req.method === 'GET') {
        try {
            const counts = await getControlCounts(sheets);
            return res.status(200).json({
                success: true,
                message: 'Contadores cargados correctamente',
                counts,
            });
        } catch (error) {
            console.error('Error leyendo contadores:', error);
            return res.status(500).json({
                success: false,
                message: 'Error al leer los contadores de control',
                error: error.message,
            });
        }
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Método no permitido' });
    }

    try {
        const { qrCode } = req.body;

        if (!qrCode) {
            return res.status(400).json({ success: false, message: 'Código QR requerido' });
        }

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${SHEET_NAME}!A:U`,
        });

        const rows = response.data.values;

        if (!rows || rows.length === 0) {
            const counts = await updateControlCounts(sheets, false);
            return res.status(404).json({
                success: false,
                message: 'No hay datos en la hoja',
                counts,
            });
        }

        let ticketRow = null;
        let rowIndex = -1;

        for (let i = 1; i < rows.length; i++) {
            if (rows[i][COLUMNS.QR_CODE_COMPRA] === qrCode) {
                ticketRow = rows[i];
                rowIndex = i + 1;
                break;
            }
        }

        if (!ticketRow) {
            const counts = await updateControlCounts(sheets, false);
            return res.status(404).json({
                success: false,
                message: 'Ticket no encontrado. Verifica el código QR.',
                counts,
            });
        }

        const ticketUsado = ticketRow[COLUMNS.TICKET_USADO];
        const alreadyUsed = ticketUsado === 'USADO' || ticketUsado === 'usado' || ticketUsado === true;

        const ticketData = {
            qr_code: qrCode,
            nombre: ticketRow[COLUMNS.NOMBRE] || null,
            fecha_uso: ticketRow[COLUMNS.FECHA_USO] || null
        };

        if (alreadyUsed) {
            const counts = await updateControlCounts(sheets, false);
            return res.status(200).json({
                success: true,
                alreadyUsed: true,
                message: 'Este ticket ya fue utilizado anteriormente',
                ticket: ticketData,
                counts,
            });
        }

        const now = new Date();
        const fechaUso = now.toLocaleString('es-MX', {
            timeZone: 'America/Mexico_City',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });

        await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: `${SHEET_NAME}!I${rowIndex}:J${rowIndex}`,
            valueInputOption: 'RAW',
            resource: { values: [['USADO', fechaUso]] }
        });

        ticketData.fecha_uso = fechaUso;
        const counts = await updateControlCounts(sheets, true);

        return res.status(200).json({
            success: true,
            alreadyUsed: false,
            message: 'Ticket verificado y marcado como usado',
            ticket: ticketData,
            counts,
        });

    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al verificar el ticket',
            error: error.message,
        });
    }
};
