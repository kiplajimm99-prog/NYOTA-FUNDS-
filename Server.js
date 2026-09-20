const express = require("express");
const axios = require("axios");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname)));


// ===============================
// GET ACCESS TOKEN
// ===============================

async function getAccessToken() {

    const credentials =
        Buffer.from(
            process.env.CONSUMER_KEY +
            ":" +
            process.env.CONSUMER_SECRET
        ).toString("base64");

    const response = await axios.get(
        "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
        {
            headers: {
                Authorization: "Basic " + credentials
            }
        }
    );

    return response.data.access_token;
}


// ===============================
// CREATE STK PASSWORD
// ===============================

function createPassword(timestamp) {

    const data =
        process.env.SHORTCODE +
        process.env.PASSKEY +
        timestamp;

    return Buffer
        .from(data)
        .toString("base64");
}


// ===============================
// START M-PESA PAYMENT
// ===============================

app.post("/api/pay", async (req, res) => {

    try {

        const phone = req.body.phone;
        const amount = req.body.amount;

        if (!phone || !amount) {

            return res.status(400).json({
                success: false,
                message: "Phone number and amount are required."
            });

        }


        // Convert 07XXXXXXXX to 2547XXXXXXXX

        let formattedPhone = phone.replace(/\s+/g, "");

        if (formattedPhone.startsWith("0")) {

            formattedPhone =
                "254" + formattedPhone.substring(1);

        }

        if (formattedPhone.startsWith("+")) {

            formattedPhone =
                formattedPhone.substring(1);

        }


        const token = await getAccessToken();


        const timestamp =
            new Date()
            .toISOString()
            .replace(/[^0-9]/g, "")
            .substring(0, 14);


        const password =
            createPassword(timestamp);


        const requestBody = {

            BusinessShortCode:
                process.env.SHORTCODE,

            Password:
                password,

            Timestamp:
                timestamp,

            TransactionType:
                "CustomerBuyGoodsOnline",

            Amount:
                Number(amount),

            PartyA:
                formattedPhone,

            PartyB:
                process.env.TILL_NUMBER,

            PhoneNumber:
                formattedPhone,

            CallBackURL:
                process.env.CALLBACK_URL,

            AccountReference:
                "NYOTA-DEMO",

            TransactionDesc:
                "Business Support Demo"

        };


        const response = await axios.post(

            "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",

            requestBody,

            {
                headers: {
                    Authorization:
                        "Bearer " + token,

                    "Content-Type":
                        "application/json"
                }
            }

        );


        res.json({

            success: true,

            message:
                "STK request sent.",

            data:
                response.data

        });


    } catch (error) {

        console.error(
            error.response
                ? error.response.data
                : error.message
        );


        res.status(500).json({

            success: false,

            message:
                "Unable to start M-PESA payment.",

            error:
                error.response
                    ? error.response.data
                    : error.message

        });

    }

});


// ===============================
// SAFARICOM CALLBACK
// ===============================

app.post("/api/callback", (req, res) => {

    console.log(
        "M-PESA CALLBACK:"
    );

    console.log(
        JSON.stringify(
            req.body,
            null,
            2
        )
    );


    // Always acknowledge the callback

    res.json({

        ResultCode: 0,

        ResultDesc:
            "Callback received successfully"

    });

});


// ===============================
// START SERVER
// ===============================

const PORT =
    process.env.PORT || 3000;

app.listen(
    PORT,
    () => {

        console.log(
            "Server running on port " +
            PORT
        );

    }
);
