import SwiftUI
import UIKit

struct RootView: View {
    @EnvironmentObject private var app: AppViewModel

    var body: some View {
        Group {
            switch app.rootState {
            case .signedOut:
                LoginView()
            case .locked:
                LockedView()
            case .signedIn:
                MainTabView()
            }
        }
        .tint(TapAddisTheme.accent)
    }
}

struct LoginView: View {
    @EnvironmentObject private var app: AppViewModel
    @State private var phone = ""
    @State private var pin = ""
    @State private var name = ""
    @State private var step: Step = .phone
    @State private var isRegistering = false
    @State private var loading = false

    private enum Step {
        case phone
        case pin
        case register
    }

    var body: some View {
        ZStack {
            TapAddisTheme.background.ignoresSafeArea()
            VStack(spacing: 0) {
                TapAddisLogoRow()
                    .padding(.horizontal, 24)
                    .padding(.top, 18)

                Spacer(minLength: 32)

                VStack(alignment: .leading, spacing: 16) {
                    switch step {
                    case .phone:
                        phoneStep
                    case .pin:
                        pinStep
                    case .register:
                        registerStep
                    }
                }
                .padding(.horizontal, 28)

                Spacer(minLength: 80)
            }
        }
        .onAppear {
            if phone.isEmpty {
                phone = app.savedPhone
            }
        }
    }

    private var phoneStep: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Login")
                .font(.system(size: 28, weight: .black))
            Text("Enter your phone number to continue.")
                .font(.system(size: 13))
                .foregroundStyle(TapAddisTheme.secondary)

            TextField("Phone number", text: $phone)
                .keyboardType(.phonePad)
                .textContentType(.telephoneNumber)
                .font(.system(size: 17, weight: .medium))
                .padding(16)
                .background(.white)
                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                .overlay(RoundedRectangle(cornerRadius: 16).stroke(TapAddisTheme.border))

            if let error = app.lastError {
                ErrorBanner(message: error)
            }

            Button {
                step = .pin
            } label: {
                Text("Next")
            }
            .buttonStyle(PrimaryButtonStyle(disabled: phone.trimmingCharacters(in: .whitespaces).isEmpty))
            .disabled(phone.trimmingCharacters(in: .whitespaces).isEmpty)

            Button {
                step = .register
            } label: {
                Text("Sign Up")
            }
            .buttonStyle(SecondaryButtonStyle())
        }
    }

    private var pinStep: some View {
        VStack(spacing: 22) {
            HStack {
                Button {
                    pin = ""
                    step = .phone
                } label: {
                    Image(systemName: "arrow.left")
                        .font(.system(size: 20, weight: .bold))
                        .foregroundStyle(TapAddisTheme.text)
                }
                Spacer()
            }

            Text("Enter PIN")
                .font(.system(size: 28, weight: .bold))
            Text(phone)
                .font(.system(size: 13))
                .foregroundStyle(TapAddisTheme.secondary)

            PinDots(count: pin.count)
            Button("Forgot PIN") {}
                .font(.system(size: 13, weight: .bold))
                .foregroundStyle(TapAddisTheme.text)

            NumberPad(pin: $pin)

            if let error = app.lastError {
                ErrorBanner(message: error)
            }

            Button {
                Task { await submitLogin() }
            } label: {
                loading ? AnyView(ProgressView().tint(.white)) : AnyView(Text("Sign In"))
            }
            .buttonStyle(PrimaryButtonStyle(disabled: pin.count != 4 || loading))
            .disabled(pin.count != 4 || loading)
        }
    }

    private var registerStep: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Button {
                    pin = ""
                    step = .phone
                } label: {
                    Image(systemName: "arrow.left")
                        .font(.system(size: 20, weight: .bold))
                        .foregroundStyle(TapAddisTheme.text)
                }
                Spacer()
            }

            Text("Create account")
                .font(.system(size: 28, weight: .black))
            Text("Use your name, phone number, and a 4-digit PIN.")
                .font(.system(size: 13))
                .foregroundStyle(TapAddisTheme.secondary)

            FormField(title: "Full name", text: $name)
            FormField(title: "Phone number", text: $phone, keyboard: .phonePad)

            SecureField("4-digit PIN", text: $pin)
                .keyboardType(.numberPad)
                .onChange(of: pin) { pin = String($0.filter(\.isNumber).prefix(4)) }
                .padding(16)
                .background(.white)
                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                .overlay(RoundedRectangle(cornerRadius: 16).stroke(TapAddisTheme.border))

            if let error = app.lastError {
                ErrorBanner(message: error)
            }

            Button {
                Task { await submitRegister() }
            } label: {
                loading ? AnyView(ProgressView().tint(.white)) : AnyView(Text("Create Account"))
            }
            .buttonStyle(PrimaryButtonStyle(disabled: name.isEmpty || phone.isEmpty || pin.count != 4 || loading))
            .disabled(name.isEmpty || phone.isEmpty || pin.count != 4 || loading)
        }
    }

    private func submitLogin() async {
        loading = true
        defer { loading = false }
        await app.login(phone: phone, pin: pin)
    }

    private func submitRegister() async {
        loading = true
        defer { loading = false }
        await app.register(name: name, phone: phone, pin: pin)
    }
}

struct LockedView: View {
    @EnvironmentObject private var app: AppViewModel

    var body: some View {
        ZStack {
            TapAddisTheme.background.ignoresSafeArea()
            VStack(spacing: 22) {
                TapAddisLogoRow()
                    .padding(.horizontal, 24)
                Spacer()
                Text("Unlock TapAddis")
                    .font(.system(size: 28, weight: .black))
                Text(app.savedPhone)
                    .font(.system(size: 14))
                    .foregroundStyle(TapAddisTheme.secondary)

                if let error = app.lastError {
                    ErrorBanner(message: error)
                }

                Button {
                    Task { await app.unlockWithBiometrics() }
                } label: {
                    Label("Use Face ID / Touch ID", systemImage: "faceid")
                }
                .buttonStyle(PrimaryButtonStyle(disabled: false))

                Button("Use PIN instead") {
                    app.usePINInstead()
                }
                .buttonStyle(SecondaryButtonStyle())
                Spacer()
            }
            .padding(.horizontal, 28)
            .padding(.top, 18)
        }
        .task {
            await app.unlockWithBiometrics()
        }
    }
}

private struct PinDots: View {
    let count: Int

    var body: some View {
        HStack(spacing: 16) {
            ForEach(0..<4, id: \.self) { index in
                Circle()
                    .fill(index < count ? Color.black : Color.black.opacity(0.10))
                    .frame(width: 10, height: 10)
            }
        }
    }
}

private struct NumberPad: View {
    @Binding var pin: String

    private let rows = [["1", "2", "3"], ["4", "5", "6"], ["7", "8", "9"], ["", "0", "delete.left.fill"]]

    var body: some View {
        VStack(spacing: 22) {
            ForEach(rows, id: \.self) { row in
                HStack(spacing: 42) {
                    ForEach(row, id: \.self) { item in
                        Button {
                            if item == "delete.left.fill" {
                                if !pin.isEmpty { pin.removeLast() }
                            } else if !item.isEmpty, pin.count < 4 {
                                pin.append(item)
                            }
                        } label: {
                            if item == "delete.left.fill" {
                                Image(systemName: item)
                                    .font(.system(size: 22, weight: .semibold))
                                    .frame(width: 52, height: 52)
                            } else {
                                Text(item)
                                    .font(.system(size: 31, weight: .medium))
                                    .frame(width: 52, height: 52)
                            }
                        }
                        .foregroundStyle(TapAddisTheme.text)
                        .opacity(item.isEmpty ? 0 : 1)
                        .disabled(item.isEmpty)
                    }
                }
            }
        }
    }
}

private struct FormField: View {
    let title: String
    @Binding var text: String
    var keyboard: UIKeyboardType = .default

    var body: some View {
        TextField(title, text: $text)
            .keyboardType(keyboard)
            .textInputAutocapitalization(.words)
            .padding(16)
            .background(.white)
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 16).stroke(TapAddisTheme.border))
    }
}
