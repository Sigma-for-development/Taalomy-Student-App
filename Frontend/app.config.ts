import 'dotenv/config';

export default {
    expo: {
        name: "Taalomy Student",
        slug: "Taalomy-student",
        version: "1.0.0",
        sdkVersion: "54.0.0",
        orientation: "portrait",
        icon: "./src/assets/images/taalomy-blue-back.png",
        scheme: "Taalomy-student",
        userInterfaceStyle: "automatic",
        newArchEnabled: true,
        ios: {
            supportsTablet: true,
            bundleIdentifier: "com.Taalomy.student",
            infoPlist: {
                NSAppTransportSecurity: {
                    NSAllowsArbitraryLoads: true,
                },
                CFBundleURLTypes: [
                    {
                        CFBundleURLName: "GoogleSignIn",
                        CFBundleURLSchemes: [
                            // Dynamic injection of Google Scheme (Requires environment variable or fallback)
                            // Note: The scheme is usually 'com.googleusercontent.apps.' + CLIENT_ID (reversed)
                            // Ideally, we extract this from the ID. For now, we use the known value but allow override.
                            process.env.GOOGLE_IOS_URL_SCHEME || "com.googleusercontent.apps.1036061781154-80sdsma4sl3832o25f079rmh24dg2a26"
                        ]
                    }
                ]
            }
        },
        extra: {
            supportsRTL: true,
            eas: {
                projectId: "28163952-6467-4279-8806-c0c47b52de36"
            }
        },
        android: {
            adaptiveIcon: {
                foregroundImage: "./src/assets/images/taalomy-blue-back.png",
                backgroundColor: "#343f52"
            },
            package: "com.Taalomy.student"
        },
        web: {
            bundler: "metro",
            output: "static",
            favicon: "./src/assets/images/taalomy-blue-back.png"
        },
        plugins: [
            "expo-router",
            [
                "expo-splash-screen",
                {
                    "image": "./src/assets/images/taalomy-blue-back.png",
                    "imageWidth": 200,
                    "resizeMode": "contain",
                    "backgroundColor": "#343f52"
                }
            ],
            "expo-localization",
            "expo-secure-store"
        ],
        experiments: {
            typedRoutes: true
        }
    }
};
