const { google } = require('googleapis');

// Configuración
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const SHEET_NAME = process.env.SHEET_NAME || 'Hoja 1';

// Índices de columnas (ajustar según tu sheet)
const COLUMNS = {
    ORDER_ID: 0,
    PAGGO_PAYMENT_ID: 1,
    STATUS_PAGO: 2,
    NOMBRE: 3,
    EMAIL: 4,
    EVENTO: 5,
    FASE: 18, // Cambio por QR_CODE_COMPRA
    CANTIDAD_TICKETS: 7,
    PRECIO_UNITARIO: 19,// Cambio por TICKET_USADO
    TOTAL_PAGADO: 20,// Cambio por FECHA_USO
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

module.exports = async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ 
            success: false, 
            message: 'Método no permitido' 
        });
    }

    try {
        const { qrCode } = req.body;

        if (!qrCode) {
            return res.status(400).json({ 
                success: false, 
                message: 'Código QR requerido' 
            });
        }

        // Verificar variables de entorno
        if (!SPREADSHEET_ID || !GOOGLE_API_KEY) {
            return res.status(500).json({ 
                success: false, 
                message: 'Error de configuración del servidor',
                error: 'Variables de entorno no configuradas'
            });
        }

        // Inicializar Google Sheets API
        const sheets = google.sheets({ 
            version: 'v4', 
            auth: GOOGLE_API_KEY 
        });

        // Leer todos los datos de la hoja
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${SHEET_NAME}!A:U`,
        });

        const rows = response.data.values;

        if (!rows || rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'No hay datos en la hoja' 
            });
        }

        // Buscar el ticket por QR code (saltar header)
        let ticketRow = null;
        let rowIndex = -1;

        for (let i = 1; i < rows.length; i++) {
            if (rows[i][COLUMNS.QR_CODE_COMPRA] === qrCode) {
                ticketRow = rows[i];
                rowIndex = i + 1; // +1 porque Google Sheets empieza en 1
                break;
            }
        }

        if (!ticketRow) {
            return res.status(404).json({ 
                success: false, 
                message: 'Ticket no encontrado. Verifica el código QR.' 
            });
        }

        // Verificar si el ticket ya fue usado
        const ticketUsado = ticketRow[COLUMNS.TICKET_USADO];
        const alreadyUsed = ticketUsado === 'SI' || ticketUsado === 'si' || ticketUsado === true;

        // Preparar datos del ticket
        const ticketData = {
            order_id: ticketRow[COLUMNS.ORDER_ID],
            nombre: ticketRow[COLUMNS.NOMBRE],
            email: ticketRow[COLUMNS.EMAIL],
            evento: ticketRow[COLUMNS.EVENTO],
            fase: ticketRow[COLUMNS.FASE],
            cantidad_tickets: ticketRow[COLUMNS.CANTIDAD_TICKETS],
            total_pagado: ticketRow[COLUMNS.TOTAL_PAGADO],
            fecha_compra: ticketRow[COLUMNS.FECHA_COMPRA],
            status_pago: ticketRow[COLUMNS.STATUS_PAGO],
            qr_code: qrCode,
            fecha_uso: ticketRow[COLUMNS.FECHA_USO] || null
        };

        // Verificar que el pago esté completado
        // if (ticketData.status_pago !== 'pagado') {
        //     return res.status(400).json({ 
        //         success: false, 
        //         message: `Ticket no pagado. Estado: ${ticketData.status_pago}`,
        //         ticket: ticketData
        //     });
        // }

        // Si ya está usado, devolver info pero no actualizarlo
        if (alreadyUsed) {
            return res.status(200).json({ 
                success: true,
                alreadyUsed: true,
                message: 'Este ticket ya fue utilizado anteriormente',
                ticket: ticketData
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
            range: `${SHEET_NAME}!I${rowIndex}:J${rowIndex}`, // Columnas I y J
            valueInputOption: 'RAW',
            resource: {
                values: [['SI', fechaUso]]
            }
        });

        ticketData.fecha_uso = fechaUso;

        return res.status(200).json({ 
            success: true,
            alreadyUsed: false,
            message: 'Ticket verificado y marcado como usado',
            ticket: ticketData,
            updated: updateResponse.data.updatedCells === 2
        });

    } catch (error) {
        console.error('Error:', error);
        
        return res.status(500).json({ 
            success: false, 
            message: 'Error al verificar el ticket',
            error: error.message
        });
    }
};
