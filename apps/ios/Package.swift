// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "LinkoraIOS",
    platforms: [
        .iOS(.v16)
    ],
    products: [
        .library(name: "LinkoraIOSCore", targets: ["LinkoraIOSCore"])
    ],
    dependencies: [],
    targets: [
        .target(
            name: "LinkoraIOSCore",
            dependencies: [],
            path: "Sources/LinkoraIOSCore"
        )
    ]
)
