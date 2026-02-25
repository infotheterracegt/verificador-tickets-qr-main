const { google } = require('googleapis');

// Configuración
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const SHEET_NAME = process.env.SHEET_NAME || 'Hoja 1';

const COLUMNS = {
    ORDER_ID: 0,
    PAGGO_PAYMENT_ID: 1,
    STATUS_PAGO: 2,
    NOMBRE: 3,
    EMAIL: 4,
    EVENTO: 5,
    FASE: 18,
    CANTIDAD_TICKETS: 7,
    PRECIO_UNITARIO: 19,
    TOTAL_PAGADO: 20,
    FECHA_COMPRA: 10,
    PDF_URL: 11,
    TRANSACTION_ID: 12,
    CODIGO_DESCUENTO: 13,
    DESCUENTO_APLICADO: 14,
    SERVICE_FEE: 15,
    SUBTOTAL: 16,
    TELEFONO: 17,
    QR_CODE_COMPRA: 6,
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

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    console.log('Received request:', req.method, req.url);

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Método no permitido' });
    }

    try {
        const { qrCode } = req.body;

        if (!qrCode) {
            return res.status(400).json({ success: false, message: 'Código QR requerido' });
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

        // Leer todos los datos de la hoja
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${SHEET_NAME}!A:U`,
        });

        const rows = response.data.values;

        if (!rows || rows.length === 0) {
            return res.status(404).json({ success: false, message: 'No hay datos en la hoja' });
        }

        // Buscar el ticket por QR code (saltar header)
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
            return res.status(404).json({ success: false, message: 'Ticket no encontrado. Verifica el código QR.' });
        }

        const ticketUsado = ticketRow[COLUMNS.TICKET_USADO];
        const alreadyUsed = ticketUsado === 'SI' || ticketUsado === 'si' || ticketUsado === true;

        const ticketData = {
            qr_code: qrCode,
            fecha_uso: ticketRow[COLUMNS.FECHA_USO] || null
        };

        if (alreadyUsed) {
            return res.status(200).json({
                success: true,
                alreadyUsed: true,
                message: 'Este ticket ya fue utilizado anteriormente',
                ticket: ticketData,
            });
        }

        // Marcar ticket como usado
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

        const updateResponse = await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: `${SHEET_NAME}!I${rowIndex}:J${rowIndex}`,
            valueInputOption: 'RAW',
            resource: { values: [['SI', fechaUso]] }
        });

        ticketData.fecha_uso = fechaUso;

        return res.status(200).json({
            success: true,
            alreadyUsed: false,
            message: 'Ticket verificado y marcado como usado',
            ticket: ticketData,
            updated: updateResponse.data.updatedCells === 2,
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
