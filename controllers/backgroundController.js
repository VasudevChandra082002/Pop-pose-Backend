const Device = require("../models/backgroundModel");
const { bucket } = require("../config/firebaseConfig"); // Import Firebase storage bucket
const { v4: uuidv4 } = require("uuid");
const { uploadFileToFirebase } = require("../utilities/firebaseutility");
const NoOfCopies = require("../models/noofCopiesModel");
const axios = require("axios");
async function registerDevice(req, res) {
    const { device_key, device_name, address, base_url, printer_name } = req.body;

    if (!device_key || !device_name || !address) {
        return res.status(400).json({ message: "Missing required fields" });
    }
    try {
        const response = await axios.get(`https://api.opencagedata.com/geocode/v1/json?key=${process.env.OPEN_CAGE_API_KEY}&q=${encodeURIComponent(address)}&pretty=1&no_annotations=1`);

        if (!response.data.results || response.data.results.length === 0) {
            return res.status(400).json({ message: "Address could not be geocoded" });
        }

        const result = response.data.results[0];
        const latitude = result.geometry.lat;
        const longitude = result.geometry.lng;

        // Handle different possible location component names
        const components = result.components;
        const city = components.city || components.town || components.village || components.county || 'Unknown';

        if (!components.country) {
            return res.status(400).json({ message: "Could not determine country from address" });
        }

        const device = new Device({
            device_key,
            device_name,
            base_url,
            printer_name,
            device_location: {
                Country: components.country,
                City: city,
                state: components.state || ''
            },
            latitude,
            longitude
        });

        await device.save();

        return res.status(201).json({
            message: "Device registered successfully",
            device,
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Internal server error" });
    }
}

async function getDevices(req, res) {
    try {
        const devices = await Device.find()
            .sort({ createdAt: -1 });;

        if (devices.length === 0) {
            return res.status(404).json({ message: "No devices found" });
        }

        return res.status(200).json(devices);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Internal server error" });
    }
}

async function updateBackgroundImage(req, res) {
    const { device_key, no_of_rolls } = req.body;
    const file = req.file;

    // if (!device_key || !file) {
    //     return res.status(400).json({ message: "Device key and background image are required" });
    // }
    console.log("file ", file);

    try {
        const device = await Device.findOne({ device_key });

        if (!device) {
            return res.status(404).json({ message: "Device not found" });
        }
        let fileUrl = null;
        if (file !== undefined) {
            fileUrl = await uploadFileToFirebase(file);

            device.background_image = fileUrl;
        }


        if (no_of_rolls !== undefined) {
            device.no_of_rolls = no_of_rolls;
        }

        await device.save();

        res.status(200).json({
            message: "Background image updated successfully",
            device,
            updatedFields: {
                background_image: fileUrl,
                ...(no_of_rolls !== undefined && { no_of_rolls: no_of_rolls })
            }
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Internal server error" });
    }
}

async function deleteDevice(req, res) {
    const { device_key } = req.params;
    try {
        const device = await Device.findOneAndDelete({ device_key });
        if (!device) {
            return res.status(404).json({ message: "Device not found" });
        }
        res.status(200).json({ message: "Device deleted successfully", device });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Internal server error" });
    }
}
async function getDeviceById(req, res) {
    const { device_key } = req.params;
    try {
        const device = await Device.findOne({ device_key });
        if (!device) {
            return res.status(404).json({ message: "Device not found" });
        }
        res.status(200).json(device);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Internal server error" });
    }
}


async function updateUrl(req, res) {
    const { device_key } = req.params;
    const { base_url } = req.body;
    try {
        const device = await Device.findOneAndUpdate(
            { device_key },
            { $set: { base_url } },
            { new: true, runValidators: false }  // Note: runValidators is set to false.
        );
        if (!device) {
            return res.status(404).json({ message: "Device not found" });
        }
        res.status(200).json({ message: "Device updated successfully", device });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Internal server error" });
    }
}


///want to get remaining number of copies in a device 

async function getRemainingCopies(req, res) {

    const { id } = req.params;
    try {
        const device = await Device.findOne({ _id: id });
        if (!device) {
            return res.status(404).json({ message: "Device not found" });
        }
        console.log("device", device);

        res.status(200).json({ message: "Remaining copies fetched successfully", device, remainingCopies: device.no_of_rolls });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Internal server error" });
    }
    // const { id } = req.body;
    // try {
    //     const device = await Device.findOne({ id });
    //     if (!device) {
    //         return res.status(404).json({ message: "Device not found" });
    //     }
    //     const noOfCopies = await NoOfCopies.findOne({ id });
    //     if (!noOfCopies) {
    //         return res.status(404).json({ message: "No of copies not found" });
    //     }
    //     const remainingCopies = device.no_of_rolls - noOfCopies.no_of_copies;
    //     res.status(200).json({ remainingCopies });
    // } catch (err) {
    //     console.error(err);
    //     return res.status(500).json({ message: "Internal server error" });
    // }
}



module.exports = {
    registerDevice,
    getDevices,
    updateBackgroundImage,
    deleteDevice,
    getDeviceById,
    updateUrl,
    getRemainingCopies
};
