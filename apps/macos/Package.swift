// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "LinkoraMac",
    platforms: [
        .macOS(.v13)
    ],
    products: [
        .library(name: "LinkoraCore", targets: ["LinkoraCore"]),
        .executable(name: "LinkoraApp", targets: ["LinkoraApp"]),
        .executable(name: "LinkoraCoreTestsRunner", targets: ["LinkoraCoreTestsRunner"])
    ],
    dependencies: [],
    targets: [
        .target(
            name: "LinkoraCore",
            dependencies: [],
            path: "Sources/LinkoraCore"
        ),
        .executableTarget(
            name: "LinkoraApp",
            dependencies: ["LinkoraCore"],
            path: "Sources/LinkoraApp"
        ),
        .executableTarget(
            name: "LinkoraCoreTestsRunner",
            dependencies: ["LinkoraCore"],
            path: "Tests/LinkoraCoreTestsRunner"
        )
    ]
)
