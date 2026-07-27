class GeolocationService {
    static getCurrentLocation() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error("Geolocation is not supported by your browser"));
            } else {
                navigator.geolocation.getCurrentPosition(
                    async (position) => {
                        const { latitude, longitude } = position.coords;
                        // Use a reverse geocoding API. Here we mock it or use a free open API (Nominatim)
                        try {
                            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
                            const data = await res.json();
                            resolve({
                                lat: latitude,
                                lng: longitude,
                                address: data.display_name,
                                city: data.address.city || data.address.town || data.address.village,
                                state: data.address.state,
                                country: data.address.country,
                                pincode: data.address.postcode
                            });
                        } catch(e) {
                            // Mock fallback
                            resolve({
                                lat: latitude,
                                lng: longitude,
                                address: "123 Mock Street",
                                city: "Hyderabad",
                                state: "Telangana",
                                country: "India",
                                pincode: "500001"
                            });
                        }
                    },
                    (error) => {
                        reject(error);
                    }
                );
            }
        });
    }
}
