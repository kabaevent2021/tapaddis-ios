import SwiftUI

@main
struct TapAddisCustomerApp: App {
    @StateObject private var app = AppViewModel()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(app)
        }
    }
}

