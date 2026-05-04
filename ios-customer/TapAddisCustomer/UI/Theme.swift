import SwiftUI

enum TapAddisTheme {
    static let background = Color(red: 0.965, green: 0.965, blue: 0.972)
    static let surface = Color.white
    static let text = Color(red: 0.04, green: 0.04, blue: 0.06)
    static let secondary = Color(red: 0.43, green: 0.43, blue: 0.48)
    static let border = Color.black.opacity(0.10)
    static let accent = Color(red: 0.98, green: 0.69, blue: 0.02)
    static let success = Color(red: 0.08, green: 0.58, blue: 0.28)
    static let danger = Color(red: 0.90, green: 0.15, blue: 0.16)

    static let cardGradient = LinearGradient(
        colors: [
            Color(red: 0.08, green: 0.10, blue: 0.20),
            Color(red: 0.02, green: 0.03, blue: 0.08)
        ],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )
}

struct PrimaryButtonStyle: ButtonStyle {
    var disabled = false

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 15, weight: .bold))
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity)
            .frame(height: 56)
            .background(disabled ? Color.gray.opacity(0.35) : Color.black)
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            .scaleEffect(configuration.isPressed && !disabled ? 0.98 : 1)
    }
}

struct SecondaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 15, weight: .bold))
            .foregroundStyle(TapAddisTheme.text)
            .frame(maxWidth: .infinity)
            .frame(height: 54)
            .background(Color.white)
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .stroke(TapAddisTheme.border, lineWidth: 1)
            )
    }
}

struct TapAddisLogoRow: View {
    @EnvironmentObject private var app: AppViewModel

    var body: some View {
        HStack {
            Image("TapAddisLogo")
                .resizable()
                .scaledToFit()
                .frame(height: 28)
            Spacer()
            LanguageMenu()
        }
    }
}

struct LanguageMenu: View {
    @EnvironmentObject private var app: AppViewModel

    var body: some View {
        Menu {
            ForEach(TapAddisLanguage.allCases) { language in
                Button {
                    app.setLanguage(language)
                } label: {
                    Text("\(language.rawValue)  \(language.label)")
                }
            }
        } label: {
            HStack(spacing: 6) {
                Image(systemName: "globe")
                    .font(.system(size: 12, weight: .semibold))
                Text(app.language.rawValue)
                    .font(.system(size: 13, weight: .bold))
            }
            .foregroundStyle(TapAddisTheme.text)
            .padding(.horizontal, 12)
            .frame(height: 34)
            .background(.white)
            .clipShape(Capsule())
            .overlay(Capsule().stroke(TapAddisTheme.border, lineWidth: 1))
        }
    }
}

struct InfoPill: View {
    let text: String
    let color: Color

    var body: some View {
        Text(text)
            .font(.system(size: 12, weight: .bold))
            .foregroundStyle(color)
            .padding(.horizontal, 12)
            .frame(height: 30)
            .background(color.opacity(0.10))
            .clipShape(Capsule())
            .overlay(Capsule().stroke(color.opacity(0.22), lineWidth: 1))
    }
}

struct ErrorBanner: View {
    let message: String

    var body: some View {
        Text(message)
            .font(.system(size: 13, weight: .semibold))
            .foregroundStyle(TapAddisTheme.danger)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(14)
            .background(TapAddisTheme.danger.opacity(0.08))
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .stroke(TapAddisTheme.danger.opacity(0.20), lineWidth: 1)
            )
    }
}

extension View {
    func cardStyle() -> some View {
        self
            .padding(18)
            .background(TapAddisTheme.surface)
            .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 22, style: .continuous)
                    .stroke(TapAddisTheme.border, lineWidth: 1)
            )
    }
}

