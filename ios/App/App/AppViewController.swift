import Foundation
import Security
import SwiftUI
import UIKit
import UserNotifications

final class AppViewController: UIViewController {
    private var hostingController: UIHostingController<MESCNativeRootView>?

    override func viewDidLoad() {
        super.viewDidLoad()

        let rootView = MESCNativeRootView()
        let hostingController = UIHostingController(rootView: rootView)
        hostingController.view.backgroundColor = .clear

        addChild(hostingController)
        view.addSubview(hostingController.view)
        hostingController.view.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            hostingController.view.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            hostingController.view.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            hostingController.view.topAnchor.constraint(equalTo: view.topAnchor),
            hostingController.view.bottomAnchor.constraint(equalTo: view.bottomAnchor)
        ])
        hostingController.didMove(toParent: self)

        self.hostingController = hostingController
    }

    override var preferredStatusBarStyle: UIStatusBarStyle {
        traitCollection.userInterfaceStyle == .dark ? .lightContent : .darkContent
    }
}

@MainActor
final class MESCNativeAppModel: ObservableObject {
    enum SessionState {
        case checking
        case unauthenticated
        case authenticated
    }

    @Published var sessionState: SessionState = .checking
    @Published var email = ""
    @Published var password = ""
    @Published var keepSignedIn = true
    @Published var selectedMonth = MESCNativeAppModel.currentMonthString()
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var user: MobileUserDTO?
    @Published var activeCommunity: MobileCommunityDTO?
    @Published var missionHome: MobileMissionHomeDTO?
    @Published var scheduleMonth: MobileScheduleMonthDTO?
    @Published var questionnaireCurrent: MobileQuestionnaireCurrentDTO?
    @Published var formationOverview: MobileFormationOverviewDTO?
    @Published var formationLessonDetail: MobileFormationLessonDetailDTO?
    @Published var isSavingQuestionnaire = false
    @Published var isLoadingFormationLesson = false
    @Published var isCompletingFormationLesson = false
    @Published var questionnaireMessage: String?
    @Published var formationMessage: String?
    @Published var isUsingFallbackData = false
    @Published var pushAuthorizationStatus: UNAuthorizationStatus = .notDetermined
    @Published var pushPermissionMessage: String?

    private let client = MESCMobileAPIClient()
    private let sessionStore = MESCNativeSessionStore()

    var firstName: String {
        guard let name = user?.name, !name.isEmpty else { return "ministro" }
        return name.split(separator: " ").first.map(String.init) ?? name
    }

    var currentMonthLabel: String {
        let month = scheduleMonth?.month ?? missionHome?.monthlySummary.month ?? selectedMonth
        return Self.monthLabel(from: month)
    }

    var currentMonthStartDate: Date {
        let month = scheduleMonth?.month ?? missionHome?.monthlySummary.month ?? selectedMonth
        return Self.monthStartDate(from: month) ?? ScheduleFixtures.monthDate
    }

    var activeQuestionnaire: MobileQuestionnaireDTO? {
        questionnaireCurrent?.questionnaire
    }

    var pushEnabled: Bool {
        switch pushAuthorizationStatus {
        case .authorized, .provisional, .ephemeral:
            return true
        default:
            return false
        }
    }

    var pushStatusText: String {
        switch pushAuthorizationStatus {
        case .authorized:
            return "Ativas neste iPhone"
        case .provisional:
            return "Ativas silenciosamente"
        case .ephemeral:
            return "Ativas temporariamente"
        case .denied:
            return "Bloqueadas nos Ajustes do iPhone"
        case .notDetermined:
            return "Toque para permitir"
        @unknown default:
            return "Status desconhecido"
        }
    }

    func restoreSessionIfNeeded() async {
        await refreshDevicePermissions()

        guard sessionState == .checking else { return }

        if sessionStore.accessToken == nil {
            if await refreshSession() {
                do {
                    try await loadHomeAndSchedules()
                    sessionState = .authenticated
                    return
                } catch {
                    errorMessage = MESCMobileAPIClient.userMessage(for: error)
                    isUsingFallbackData = true
                    sessionState = .authenticated
                    return
                }
            } else {
                sessionState = .unauthenticated
                return
            }
        }

        do {
            try await loadHomeAndSchedules()
            sessionState = .authenticated
        } catch {
            if Self.isAuthenticationFailure(error), await refreshSession() {
                do {
                    try await loadHomeAndSchedules()
                    sessionState = .authenticated
                    return
                } catch {
                    handleSessionFailure(error)
                }
            } else if Self.isAuthenticationFailure(error) {
                handleSessionFailure(error)
            } else {
                errorMessage = MESCMobileAPIClient.userMessage(for: error)
                isUsingFallbackData = true
                sessionState = .authenticated
            }
        }
    }

    func signIn() async {
        let trimmedEmail = email.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedEmail.isEmpty, !password.isEmpty else {
            errorMessage = "Informe e-mail e senha."
            return
        }

        isLoading = true
        errorMessage = nil
        isUsingFallbackData = false

        do {
            let response = try await client.login(
                email: trimmedEmail,
                password: password,
                keepSignedIn: keepSignedIn,
                deviceId: sessionStore.deviceId,
                appVersion: Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String
            )
            persist(authResponse: response)
            user = response.user
            activeCommunity = response.communities.first(where: { $0.id == response.activeCommunityId }) ?? response.communities.first
            try await loadHomeAndSchedules()
            sessionState = .authenticated
            password = ""
        } catch {
            errorMessage = MESCMobileAPIClient.userMessage(for: error)
            sessionState = .unauthenticated
        }

        isLoading = false
    }

    func reload() async {
        isLoading = true
        errorMessage = nil

        do {
            try await loadHomeAndSchedules()
        } catch {
            if Self.isAuthenticationFailure(error), await refreshSession() {
                do {
                    try await loadHomeAndSchedules()
                } catch {
                    errorMessage = MESCMobileAPIClient.userMessage(for: error)
                    isUsingFallbackData = true
                }
            } else if Self.isAuthenticationFailure(error) {
                handleSessionFailure(error)
            } else {
                errorMessage = MESCMobileAPIClient.userMessage(for: error)
                isUsingFallbackData = true
            }
        }

        isLoading = false
    }

    func signOut() {
        sessionStore.clearTokens()
        user = nil
        activeCommunity = nil
        missionHome = nil
        scheduleMonth = nil
        questionnaireCurrent = nil
        formationOverview = nil
        formationLessonDetail = nil
        questionnaireMessage = nil
        formationMessage = nil
        errorMessage = nil
        isUsingFallbackData = false
        selectedMonth = Self.currentMonthString()
        sessionState = .unauthenticated
    }

    func refreshDevicePermissions() async {
        let settings = await UNUserNotificationCenter.current().notificationSettings()
        pushAuthorizationStatus = settings.authorizationStatus
    }

    func requestPushNotifications() async {
        pushPermissionMessage = nil

        if pushAuthorizationStatus == .denied {
            openSystemSettings()
            return
        }

        do {
            let granted = try await UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound])
            await refreshDevicePermissions()
            if granted {
                await MainActor.run {
                    UIApplication.shared.registerForRemoteNotifications()
                }
            } else {
                pushPermissionMessage = "Permissão não concedida. Você pode habilitar em Ajustes do iPhone."
            }
        } catch {
            pushPermissionMessage = "Não foi possível solicitar notificações agora."
        }
    }

    func openSystemSettings() {
        guard let url = URL(string: UIApplication.openSettingsURLString) else { return }
        UIApplication.shared.open(url)
    }

    func scheduleDays(for mode: ScheduleMode) -> [ScheduleDay] {
        guard let scheduleMonth else { return ScheduleFixtures.days }

        let startDate = Self.monthStartDate(from: scheduleMonth.month) ?? ScheduleFixtures.monthDate
        let dayRange = Calendar.current.range(of: .day, in: .month, for: startDate) ?? 1..<32

        let missionsByDay: [Int: [ScheduleMission]]
        switch mode {
        case .full:
            missionsByDay = Dictionary(grouping: buildPublicScheduleMissions(from: scheduleMonth.publicSchedule.assignments), by: \.dayNumber)
                .mapValues { $0.sorted { $0.time < $1.time } }
        case .mine, .month:
            missionsByDay = Dictionary(grouping: scheduleMonth.schedules.compactMap { schedule -> ScheduleMission? in
                guard let date = Self.parseDate(schedule.date), let day = Calendar.current.dateComponents([.day], from: date).day else {
                    return nil
                }
                return ScheduleMission(
                    dayNumber: day,
                    time: Self.timeLabel(schedule.time),
                    title: Self.scheduleTitle(type: schedule.type),
                    community: schedule.location ?? activeCommunity?.name ?? scheduleMonth.community.name,
                    role: Self.positionLabel(schedule.position),
                    ministers: [user?.name ?? firstName]
                )
            }, by: \.dayNumber)
            .mapValues { $0.sorted { $0.time < $1.time } }
        }

        return dayRange.compactMap { day -> ScheduleDay? in
            guard let date = Calendar.current.date(byAdding: .day, value: day - 1, to: startDate) else { return nil }
            return ScheduleDay(
                id: day,
                dayNumber: day,
                date: date,
                missions: missionsByDay[day] ?? []
            )
        }
    }

    func submitQuestionnaire(answers: [MobileQuestionnaireAnswerDTO]) async -> Bool {
        guard let accessToken = sessionStore.accessToken else {
            handleSessionFailure(MESCMobileAPIError.unauthenticated)
            return false
        }

        guard let questionnaire = activeQuestionnaire else {
            questionnaireMessage = "Nenhum questionário publicado para responder."
            return false
        }

        isSavingQuestionnaire = true
        questionnaireMessage = nil

        do {
            _ = try await client.submitQuestionnaire(
                questionnaireId: questionnaire.id,
                accessToken: accessToken,
                communityId: sessionStore.activeCommunityId,
                deviceId: sessionStore.deviceId,
                idempotencyKey: UUID().uuidString,
                responses: answers
            )
            questionnaireMessage = "Resposta salva com sucesso."
            try await loadCurrentQuestionnaire(accessToken: accessToken)
            isSavingQuestionnaire = false
            return true
        } catch {
            if Self.isAuthenticationFailure(error), await refreshSession(), let accessToken = sessionStore.accessToken {
                do {
                    _ = try await client.submitQuestionnaire(
                        questionnaireId: questionnaire.id,
                        accessToken: accessToken,
                        communityId: sessionStore.activeCommunityId,
                        deviceId: sessionStore.deviceId,
                        idempotencyKey: UUID().uuidString,
                        responses: answers
                    )
                    questionnaireMessage = "Resposta salva com sucesso."
                    try await loadCurrentQuestionnaire(accessToken: accessToken)
                    isSavingQuestionnaire = false
                    return true
                } catch {
                    questionnaireMessage = MESCMobileAPIClient.userMessage(for: error)
                }
            } else {
                questionnaireMessage = MESCMobileAPIClient.userMessage(for: error)
            }
        }

        isSavingQuestionnaire = false
        return false
    }

    func shiftScheduleMonth(by monthDelta: Int) async {
        guard let currentStart = Self.monthStartDate(from: selectedMonth),
              let nextStart = Calendar.current.date(byAdding: .month, value: monthDelta, to: currentStart)
        else {
            return
        }

        selectedMonth = Self.monthString(from: nextStart)
        isLoading = true
        errorMessage = nil

        do {
            try await loadHomeAndSchedules()
        } catch {
            if Self.isAuthenticationFailure(error), await refreshSession() {
                do {
                    try await loadHomeAndSchedules()
                } catch {
                    errorMessage = MESCMobileAPIClient.userMessage(for: error)
                    isUsingFallbackData = true
                }
            } else if Self.isAuthenticationFailure(error) {
                handleSessionFailure(error)
            } else {
                errorMessage = MESCMobileAPIClient.userMessage(for: error)
                isUsingFallbackData = true
            }
        }

        isLoading = false
    }

    func openFormationLesson(_ lesson: MobileFormationLessonDTO) async -> Bool {
        guard let accessToken = sessionStore.accessToken else {
            handleSessionFailure(MESCMobileAPIError.unauthenticated)
            return false
        }

        guard let trackId = resolvedTrackId(for: lesson) else {
            formationMessage = "Não foi possível localizar a trilha desta aula."
            return false
        }

        isLoadingFormationLesson = true
        formationMessage = nil

        do {
            formationLessonDetail = try await client.formationLesson(
                trackId: trackId,
                moduleId: lesson.moduleId,
                lessonNumber: lesson.lessonNumber,
                accessToken: accessToken,
                communityId: sessionStore.activeCommunityId,
                deviceId: sessionStore.deviceId
            )
            isLoadingFormationLesson = false
            return true
        } catch {
            if Self.isAuthenticationFailure(error), await refreshSession(), let accessToken = sessionStore.accessToken {
                do {
                    formationLessonDetail = try await client.formationLesson(
                        trackId: trackId,
                        moduleId: lesson.moduleId,
                        lessonNumber: lesson.lessonNumber,
                        accessToken: accessToken,
                        communityId: sessionStore.activeCommunityId,
                        deviceId: sessionStore.deviceId
                    )
                    isLoadingFormationLesson = false
                    return true
                } catch {
                    formationMessage = MESCMobileAPIClient.userMessage(for: error)
                }
            } else if Self.isAuthenticationFailure(error) {
                handleSessionFailure(error)
            } else {
                formationMessage = MESCMobileAPIClient.userMessage(for: error)
            }
        }

        isLoadingFormationLesson = false
        return false
    }

    func completeCurrentFormationLesson() async -> Bool {
        guard let detail = formationLessonDetail else {
            formationMessage = "Abra uma aula antes de concluir."
            return false
        }

        guard detail.progress.status != "completed" else {
            formationMessage = "Aula já concluída."
            return true
        }

        guard let accessToken = sessionStore.accessToken else {
            handleSessionFailure(MESCMobileAPIError.unauthenticated)
            return false
        }

        isCompletingFormationLesson = true
        formationMessage = nil

        do {
            let response = try await client.completeFormationLesson(
                lessonId: detail.lesson.id,
                accessToken: accessToken,
                communityId: sessionStore.activeCommunityId,
                deviceId: sessionStore.deviceId,
                idempotencyKey: UUID().uuidString
            )
            formationLessonDetail = detail.withProgress(response.progress)
            try await loadFormationOverview(accessToken: accessToken)
            formationMessage = "Aula concluída com sucesso."
            isCompletingFormationLesson = false
            return true
        } catch {
            if Self.isAuthenticationFailure(error), await refreshSession(), let accessToken = sessionStore.accessToken {
                do {
                    let response = try await client.completeFormationLesson(
                        lessonId: detail.lesson.id,
                        accessToken: accessToken,
                        communityId: sessionStore.activeCommunityId,
                        deviceId: sessionStore.deviceId,
                        idempotencyKey: UUID().uuidString
                    )
                    formationLessonDetail = detail.withProgress(response.progress)
                    try await loadFormationOverview(accessToken: accessToken)
                    formationMessage = "Aula concluída com sucesso."
                    isCompletingFormationLesson = false
                    return true
                } catch {
                    formationMessage = MESCMobileAPIClient.userMessage(for: error)
                }
            } else if Self.isAuthenticationFailure(error) {
                handleSessionFailure(error)
            } else {
                formationMessage = MESCMobileAPIClient.userMessage(for: error)
            }
        }

        isCompletingFormationLesson = false
        return false
    }

    private func loadHomeAndSchedules() async throws {
        guard let accessToken = sessionStore.accessToken else {
            throw MESCMobileAPIError.unauthenticated
        }

        let month = selectedMonth
        async let home = client.missionHome(
            accessToken: accessToken,
            communityId: sessionStore.activeCommunityId,
            deviceId: sessionStore.deviceId,
            month: month
        )
        async let schedules = client.scheduleMonth(
            accessToken: accessToken,
            communityId: sessionStore.activeCommunityId,
            deviceId: sessionStore.deviceId,
            month: month
        )

        let (homePayload, schedulesPayload) = try await (home, schedules)
        missionHome = homePayload
        scheduleMonth = schedulesPayload
        user = homePayload.user
        activeCommunity = homePayload.community
        sessionStore.activeCommunityId = homePayload.community.id
        isUsingFallbackData = false

        do {
            try await loadCurrentQuestionnaire(accessToken: accessToken)
        } catch {
            if Self.isAuthenticationFailure(error) {
                throw error
            }
        }

        do {
            try await loadFormationOverview(accessToken: accessToken)
        } catch {
            if Self.isAuthenticationFailure(error) {
                throw error
            }
        }
    }

    private func loadCurrentQuestionnaire(accessToken: String) async throws {
        questionnaireCurrent = try await client.currentQuestionnaire(
            accessToken: accessToken,
            communityId: sessionStore.activeCommunityId,
            deviceId: sessionStore.deviceId,
            month: selectedMonth
        )
    }

    private func loadFormationOverview(accessToken: String) async throws {
        let response = try await client.formationOverview(
            accessToken: accessToken,
            communityId: sessionStore.activeCommunityId,
            deviceId: sessionStore.deviceId
        )
        formationOverview = response.overview
    }

    private func refreshSession() async -> Bool {
        guard let refreshToken = sessionStore.refreshToken else { return false }

        do {
            let response = try await client.refresh(refreshToken: refreshToken, deviceId: sessionStore.deviceId)
            persist(authResponse: response)
            user = response.user
            activeCommunity = response.communities.first(where: { $0.id == response.activeCommunityId }) ?? response.communities.first
            return true
        } catch {
            return false
        }
    }

    private func persist(authResponse response: MobileAuthResponseDTO) {
        sessionStore.accessToken = response.auth.accessToken
        sessionStore.refreshToken = response.auth.refreshToken
        sessionStore.activeCommunityId = response.activeCommunityId
    }

    private func handleSessionFailure(_ error: Error) {
        sessionStore.clearTokens()
        errorMessage = MESCMobileAPIClient.userMessage(for: error)
        sessionState = .unauthenticated
    }

    private static func isAuthenticationFailure(_ error: Error) -> Bool {
        switch error {
        case MESCMobileAPIError.unauthenticated:
            return true
        case let MESCMobileAPIError.server(status, _):
            return status == 401
        default:
            return false
        }
    }

    private func resolvedTrackId(for lesson: MobileFormationLessonDTO) -> String? {
        if let trackId = lesson.trackId, !trackId.isEmpty {
            return trackId
        }

        return formationOverview?.tracks.first(where: { track in
            track.modules.contains { module in
                module.id == lesson.moduleId || module.lessons.contains { $0.id == lesson.id }
            }
        })?.id
    }

    private func buildPublicScheduleMissions(from assignments: [MobilePublicScheduleAssignmentDTO]) -> [ScheduleMission] {
        let grouped = Dictionary(grouping: assignments) { assignment in
            "\(assignment.date)|\(assignment.time)|\(assignment.type)|\(assignment.location ?? "")"
        }

        return grouped.values.compactMap { group in
            guard let first = group.first,
                  let date = Self.parseDate(first.date),
                  let day = Calendar.current.dateComponents([.day], from: date).day
            else {
                return nil
            }

            let ministers = group
                .sorted { $0.position < $1.position }
                .map { assignment in
                    let name = assignment.scheduleDisplayName ?? assignment.ministerName ?? "Vaga"
                    return "\(Self.positionLabel(assignment.position)): \(name)"
                }

            return ScheduleMission(
                dayNumber: day,
                time: Self.timeLabel(first.time),
                title: Self.scheduleTitle(type: first.type),
                community: first.location ?? activeCommunity?.name ?? "Comunidade",
                role: group.first(where: { $0.isCurrentUser }).map { Self.positionLabel($0.position) } ?? "\(group.count) ministros",
                ministers: ministers
            )
        }
    }

    private static func currentMonthString() -> String {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "pt_BR")
        formatter.dateFormat = "yyyy-MM"
        return formatter.string(from: Date())
    }

    private static func monthString(from date: Date) -> String {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "pt_BR")
        formatter.dateFormat = "yyyy-MM"
        return formatter.string(from: date)
    }

    private static func monthStartDate(from month: String) -> Date? {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "pt_BR")
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.date(from: "\(month)-01")
    }

    private static func monthLabel(from month: String) -> String {
        guard let date = monthStartDate(from: month) else { return month }
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "pt_BR")
        formatter.dateFormat = "LLLL 'de' yyyy"
        return formatter.string(from: date).capitalized
    }

    private static func parseDate(_ value: String?) -> Date? {
        guard let value else { return nil }
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "pt_BR")
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.date(from: value)
    }

    static func scheduleDateTitle(date: String?) -> String {
        guard let parsed = parseDate(date) else { return "Próxima missão" }
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "pt_BR")
        formatter.dateFormat = "EEEE, dd 'de' MMMM"
        return formatter.string(from: parsed).capitalized
    }

    static func compactDateTimeLabel(_ value: String) -> String {
        let isoWithFraction = ISO8601DateFormatter()
        isoWithFraction.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let iso = ISO8601DateFormatter()
        let parsed = isoWithFraction.date(from: value) ?? iso.date(from: value) ?? parseDate(value)

        guard let parsed else { return value }
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "pt_BR")
        formatter.dateFormat = "dd/MM/yyyy HH:mm"
        return formatter.string(from: parsed)
    }

    static func timeLabel(_ value: String) -> String {
        String(value.prefix(5))
    }

    static func scheduleTitle(type: String) -> String {
        switch type.lowercased() {
        case "missa", "mass", "schedule":
            return "Missa"
        case "adoration":
            return "Adoração"
        default:
            return type.capitalized
        }
    }

    static func positionLabel(_ position: Int?) -> String {
        guard let position, position > 0 else { return "Ministro" }
        return "P\(position)"
    }
}

struct MESCNativeRootView: View {
    @State private var selectedTab: MESCTab = .mission
    @StateObject private var appModel = MESCNativeAppModel()

    var body: some View {
        Group {
            switch appModel.sessionState {
            case .checking:
                LoadingScreen()
            case .unauthenticated:
                NativeLoginScreen()
                    .environmentObject(appModel)
            case .authenticated:
                authenticatedShell
                    .environmentObject(appModel)
            }
        }
        .task {
            await appModel.restoreSessionIfNeeded()
        }
        .tint(MESCColor.primaryRed)
    }

    private var authenticatedShell: some View {
        ZStack {
            MESCBackground()

            currentScreen
                .padding(.bottom, 92)
        }
        .safeAreaInset(edge: .bottom) {
            MESCGlassTabBar(selectedTab: $selectedTab)
                .padding(.horizontal, 14)
                .padding(.bottom, 8)
        }
    }

    @ViewBuilder
    private var currentScreen: some View {
        switch selectedTab {
        case .mission:
            MissionScreen()
        case .schedules:
            SchedulesScreen()
        case .formation:
            FormationScreen()
        case .profile:
            ProfileScreen()
        case .settings:
            SettingsScreen()
        }
    }
}

enum MESCTab: String, CaseIterable, Identifiable {
    case mission
    case schedules
    case formation
    case profile
    case settings

    var id: String { rawValue }

    var title: String {
        switch self {
        case .mission: return "Missão"
        case .schedules: return "Escalas"
        case .formation: return "Formação"
        case .profile: return "Perfil"
        case .settings: return "Ajustes"
        }
    }

    var symbol: String {
        switch self {
        case .mission: return "cross.case"
        case .schedules: return "calendar"
        case .formation: return "book.closed"
        case .profile: return "person"
        case .settings: return "gearshape"
        }
    }
}

struct MESCGlassTabBar: View {
    @Binding var selectedTab: MESCTab

    var body: some View {
        HStack(spacing: 6) {
            ForEach(MESCTab.allCases) { tab in
                Button {
                    selectedTab = tab
                } label: {
                    VStack(spacing: 4) {
                        Image(systemName: tab.symbol)
                            .font(.system(size: 20, weight: .semibold))
                        Text(tab.title)
                            .font(.system(size: 11, weight: .medium))
                            .lineLimit(1)
                            .minimumScaleFactor(0.78)
                    }
                    .frame(maxWidth: .infinity)
                    .frame(height: 58)
                    .foregroundStyle(selectedTab == tab ? MESCColor.accent : MESCColor.textSecondary)
                    .background {
                        if selectedTab == tab {
                            RoundedRectangle(cornerRadius: 18, style: .continuous)
                                .fill(MESCColor.gold.opacity(0.16))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 18, style: .continuous)
                                        .stroke(MESCColor.gold.opacity(0.28), lineWidth: 1)
                                )
                        }
                    }
                }
                .buttonStyle(.plain)
                .accessibilityLabel(tab.title)
            }
        }
        .padding(8)
        .mescGlass(cornerRadius: 28)
    }
}

struct LoadingScreen: View {
    var body: some View {
        ZStack {
            MESCBackground()
            VStack(spacing: 18) {
                MESCLogoMark(size: 92, cornerRadius: 30)

                ProgressView()
                    .tint(MESCColor.accent)

                Text("Preparando sua missão")
                    .font(MESCFont.body.weight(.semibold))
                    .foregroundStyle(MESCColor.textPrimary)
            }
        }
    }
}

struct NativeLoginScreen: View {
    @EnvironmentObject private var appModel: MESCNativeAppModel

    var body: some View {
        ZStack {
            MESCBackground()

            ScrollView(showsIndicators: false) {
                VStack(spacing: 22) {
                    Spacer(minLength: 38)

                    VStack(spacing: 12) {
                        MESCLogoMark(size: 108, cornerRadius: 34)

                        Text("MESC")
                            .font(MESCFont.screenTitle)
                            .foregroundStyle(MESCColor.textPrimary)

                        Text("São Judas Tadeu")
                            .font(MESCFont.callout)
                            .foregroundStyle(MESCColor.textSecondary)
                    }
                    .padding(.top, 20)

                    GlassPanel(spacing: 16) {
                        SectionTitle(title: "Entrar", symbol: "person.crop.circle.badge.checkmark")

                        VStack(alignment: .leading, spacing: 8) {
                            Text("E-mail")
                                .font(MESCFont.caption)
                                .foregroundStyle(MESCColor.textSecondary)
                            TextField("seu@email.com", text: $appModel.email)
                                .textInputAutocapitalization(.never)
                                .keyboardType(.emailAddress)
                                .autocorrectionDisabled()
                                .font(MESCFont.body)
                                .padding(14)
                                .background(MESCColor.surface, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                                .overlay(fieldBorder)
                        }

                        VStack(alignment: .leading, spacing: 8) {
                            Text("Senha")
                                .font(MESCFont.caption)
                                .foregroundStyle(MESCColor.textSecondary)
                            SecureField("Sua senha", text: $appModel.password)
                                .font(MESCFont.body)
                                .padding(14)
                                .background(MESCColor.surface, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                                .overlay(fieldBorder)
                        }

                        Toggle(isOn: $appModel.keepSignedIn) {
                            Text("Manter conectado neste aparelho")
                                .font(MESCFont.subheadline)
                        }
                        .tint(MESCColor.accent)

                        if let errorMessage = appModel.errorMessage {
                            Label(errorMessage, systemImage: "exclamationmark.triangle")
                                .font(MESCFont.caption)
                                .foregroundStyle(MESCColor.primaryWine)
                                .fixedSize(horizontal: false, vertical: true)
                        }

                        MESCPrimaryButton(
                            title: appModel.isLoading ? "Entrando..." : "Entrar",
                            symbol: "arrow.right.circle"
                        ) {
                            Task { await appModel.signIn() }
                        }
                        .disabled(appModel.isLoading)
                    }

                    Text("Primeiro acesso sempre com senha. Biometria será habilitada depois do login.")
                        .font(MESCFont.caption)
                        .multilineTextAlignment(.center)
                        .foregroundStyle(MESCColor.textSecondary)
                        .padding(.horizontal, 24)

                    Spacer(minLength: 32)
                }
                .padding(.horizontal, 18)
            }
        }
    }

    private var fieldBorder: some View {
        RoundedRectangle(cornerRadius: 14, style: .continuous)
            .stroke(MESCColor.separator, lineWidth: 1)
    }
}

struct MissionScreen: View {
    @EnvironmentObject private var appModel: MESCNativeAppModel
    @State private var isQuestionnairePresented = false

    var body: some View {
        let mission = appModel.missionHome?.nextMission

        MESCScrollScreen(title: "Sua Missão", subtitle: "Paz e bem, \(appModel.firstName)") {
            if appModel.isUsingFallbackData {
                FallbackBanner()
            }

            GlassPanel(spacing: 18) {
                HStack(alignment: .top, spacing: 14) {
                    SymbolTile(symbol: "sparkles", tint: MESCColor.accent)
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Próxima missão")
                            .font(MESCFont.caption)
                            .foregroundStyle(MESCColor.accent)
                        Text(mission.map { MESCNativeAppModel.scheduleDateTitle(date: $0.date) } ?? "Nenhuma missão publicada")
                            .font(MESCFont.titleSerif)
                        Text(mission.map { "\(MESCNativeAppModel.timeLabel($0.time)) - \($0.location ?? appModel.activeCommunity?.name ?? "Comunidade")" } ?? "Assim que a escala for publicada, ela aparecerá aqui.")
                            .font(MESCFont.body)
                            .foregroundStyle(MESCColor.textSecondary)
                        Text(mission.map { MESCNativeAppModel.positionLabel($0.position) } ?? "Sem posição definida")
                            .font(MESCFont.body.weight(.semibold))
                    }
                    Spacer()
                }

                HStack(spacing: 12) {
                    MESCPrimaryButton(title: "Confirmar", symbol: "checkmark.circle")
                    MESCSecondaryButton(title: "Trocar", symbol: "arrow.triangle.2.circlepath")
                }
            }

            HStack(spacing: 12) {
                StatusPill(title: questionnaireStatus, symbol: "list.bullet.clipboard", tint: MESCColor.gold)
                StatusPill(title: noticesStatus, symbol: "bell", tint: MESCColor.accent)
            }

            if let questionnaire = appModel.activeQuestionnaire {
                GlassPanel(spacing: 14) {
                    SectionTitle(title: questionnaire.responseStatus == "answered" ? "Questionário respondido" : "Questionário aberto", symbol: "list.clipboard")
                    Text(questionnaire.title)
                        .font(MESCFont.cardTitle)
                    Text(questionnaire.description ?? "Informe sua disponibilidade para que a coordenação gere uma escala mais fiel.")
                        .font(MESCFont.body)
                        .foregroundStyle(MESCColor.textSecondary)
                        .fixedSize(horizontal: false, vertical: true)
                    if let deadline = questionnaire.deadline {
                        Text("Prazo: \(MESCNativeAppModel.compactDateTimeLabel(deadline))")
                            .font(MESCFont.caption)
                            .foregroundStyle(MESCColor.accent)
                    }
                    MESCPrimaryButton(
                        title: questionnaire.responseStatus == "answered" ? "Revisar resposta" : "Responder agora",
                        symbol: "square.and.pencil"
                    ) {
                        isQuestionnairePresented = true
                    }
                }
            }

            GlassPanel(spacing: 12) {
                SectionTitle(title: "Hoje no MESC", symbol: "sun.max")
                MissionRow(time: "07:30", title: "Chegar e preparar a comunhão", detail: "Chegue 30 minutos antes.")
                MissionRow(time: "08:00", title: "Missa", detail: "Atue conforme posição indicada.")
                MissionRow(time: "09:10", title: "Registro", detail: "Confirme presenca ao final.")
            }
        }
        .sheet(isPresented: $isQuestionnairePresented) {
            QuestionnaireSheet()
                .environmentObject(appModel)
        }
    }

    private var questionnaireStatus: String {
        let hasQuestionnaire = appModel.missionHome?.pendingActions.contains { $0.type == "questionnaire" } ?? true
        return hasQuestionnaire ? "Questionário aberto" : "Questionário em dia"
    }

    private var noticesStatus: String {
        let count = appModel.missionHome?.notices.filter { !$0.read }.count ?? 0
        return count == 1 ? "1 aviso" : "\(count) avisos"
    }
}

struct QuestionnaireSheet: View {
    @EnvironmentObject private var appModel: MESCNativeAppModel
    @Environment(\.dismiss) private var dismiss
    @State private var answers: [String: QuestionnaireDraftAnswer] = [:]
    @State private var localMessage: String?

    var body: some View {
        ZStack {
            MESCBackground()

            if let questionnaire = appModel.activeQuestionnaire {
                ScrollView(showsIndicators: false) {
                    VStack(alignment: .leading, spacing: 18) {
                        header(questionnaire)

                        if questionnaire.responseStatus == "answered" {
                            Label("Você já respondeu este questionário. Enviar novamente atualiza sua resposta.", systemImage: "checkmark.seal")
                                .font(MESCFont.caption)
                                .foregroundStyle(MESCColor.accent)
                                .fixedSize(horizontal: false, vertical: true)
                                .padding(14)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .mescGlass(cornerRadius: 16)
                        }

                        ForEach(questionnaire.questions) { question in
                            QuestionnaireQuestionCard(
                                question: question,
                                draft: binding(for: question)
                            )
                        }

                        if let message = localMessage ?? appModel.questionnaireMessage {
                            Label(message, systemImage: "info.circle")
                                .font(MESCFont.caption)
                                .foregroundStyle(message.contains("sucesso") ? MESCColor.accent : MESCColor.primaryWine)
                                .fixedSize(horizontal: false, vertical: true)
                        }

                        MESCPrimaryButton(
                            title: appModel.isSavingQuestionnaire ? "Salvando..." : "Salvar resposta",
                            symbol: "checkmark.circle"
                        ) {
                            Task { await save(questionnaire) }
                        }
                        .disabled(appModel.isSavingQuestionnaire)
                    }
                    .padding(.horizontal, 18)
                    .padding(.top, 20)
                    .padding(.bottom, 34)
                }
            } else {
                EmptyState(title: "Nenhum questionário aberto", detail: "Quando a coordenação publicar um questionário, ele aparecerá aqui.")
                    .padding(24)
            }
        }
    }

    private func header(_ questionnaire: MobileQuestionnaireDTO) -> some View {
        GlassPanel(spacing: 12) {
            HStack(alignment: .top, spacing: 12) {
                SymbolTile(symbol: "list.clipboard", tint: MESCColor.gold)
                VStack(alignment: .leading, spacing: 6) {
                    Text("Questionário")
                        .font(MESCFont.caption)
                        .foregroundStyle(MESCColor.accent)
                    Text(questionnaire.title)
                        .font(MESCFont.title2)
                    if let description = questionnaire.description {
                        Text(description)
                            .font(MESCFont.body)
                            .foregroundStyle(MESCColor.textSecondary)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    if let deadline = questionnaire.deadline {
                        Text("Prazo: \(MESCNativeAppModel.compactDateTimeLabel(deadline))")
                            .font(MESCFont.caption)
                            .foregroundStyle(MESCColor.textSecondary)
                    }
                }
                Spacer()
                Button {
                    dismiss()
                } label: {
                    Image(systemName: "xmark")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundStyle(MESCColor.textPrimary)
                        .frame(width: 34, height: 34)
                        .background(MESCColor.surface.opacity(0.72), in: Circle())
                }
                .buttonStyle(.plain)
            }
        }
    }

    private func binding(for question: MobileQuestionnaireQuestionDTO) -> Binding<QuestionnaireDraftAnswer> {
        Binding(
            get: { answers[question.id] ?? QuestionnaireDraftAnswer() },
            set: { answers[question.id] = $0 }
        )
    }

    private func save(_ questionnaire: MobileQuestionnaireDTO) async {
        let result = makePayload(for: questionnaire)
        if let validationMessage = result.validationMessage {
            localMessage = validationMessage
            return
        }

        localMessage = nil
        let success = await appModel.submitQuestionnaire(answers: result.answers)
        if success {
            localMessage = "Resposta salva com sucesso."
        }
    }

    private func makePayload(for questionnaire: MobileQuestionnaireDTO) -> (answers: [MobileQuestionnaireAnswerDTO], validationMessage: String?) {
        var payload: [MobileQuestionnaireAnswerDTO] = []

        for question in questionnaire.questions {
            let draft = answers[question.id] ?? QuestionnaireDraftAnswer()
            if question.required == true, draft.isEmpty(for: question) {
                return ([], "Responda a pergunta obrigatória: \(question.title)")
            }

            guard !draft.isEmpty(for: question) else { continue }
            payload.append(MobileQuestionnaireAnswerDTO(questionId: question.id, answer: draft.answerValue(for: question)))
        }

        guard !payload.isEmpty else {
            return ([], "Preencha ao menos uma resposta antes de salvar.")
        }

        return (payload, nil)
    }
}

struct QuestionnaireQuestionCard: View {
    let question: MobileQuestionnaireQuestionDTO
    @Binding var draft: QuestionnaireDraftAnswer

    var body: some View {
        GlassPanel(spacing: 14) {
            VStack(alignment: .leading, spacing: 5) {
                HStack(alignment: .firstTextBaseline, spacing: 5) {
                    Text(question.title)
                        .font(MESCFont.cardTitle)
                    if question.required == true {
                        Text("*")
                            .font(MESCFont.cardTitle)
                            .foregroundStyle(MESCColor.primaryWine)
                    }
                }
                Text(questionTypeLabel)
                    .font(MESCFont.caption)
                    .foregroundStyle(MESCColor.textSecondary)
            }

            switch question.type.lowercased() {
            case "checkbox", "multiple_select", "multi_select":
                VStack(spacing: 10) {
                    ForEach(question.options ?? [], id: \.self) { option in
                        ChoiceRow(title: option, isSelected: draft.multi.contains(option)) {
                            var value = draft
                            if value.multi.contains(option) {
                                value.multi.remove(option)
                            } else {
                                value.multi.insert(option)
                            }
                            draft = value
                        }
                    }
                }
            case "boolean", "switch":
                Toggle(isOn: Binding(
                    get: { draft.bool ?? false },
                    set: { draft.bool = $0 }
                )) {
                    Text("Sim")
                        .font(MESCFont.body)
                }
                .tint(MESCColor.accent)
            case "text", "textarea", "long_text":
                TextField("Digite sua resposta", text: $draft.text)
                    .font(MESCFont.body)
                    .padding(14)
                    .background(MESCColor.surface.opacity(0.72), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                    .overlay(
                        RoundedRectangle(cornerRadius: 14, style: .continuous)
                            .stroke(MESCColor.separator, lineWidth: 1)
                    )
            default:
                VStack(spacing: 10) {
                    ForEach(question.options ?? [], id: \.self) { option in
                        ChoiceRow(title: option, isSelected: draft.single == option) {
                            draft.single = option
                        }
                    }
                }
            }
        }
    }

    private var questionTypeLabel: String {
        switch question.type.lowercased() {
        case "checkbox", "multiple_select", "multi_select":
            return "Selecione uma ou mais opções"
        case "boolean", "switch":
            return "Ative se a resposta for sim"
        case "text", "textarea", "long_text":
            return "Resposta livre"
        default:
            return "Selecione uma opção"
        }
    }
}

struct ChoiceRow: View {
    let title: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 12) {
                Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                    .font(.system(size: 21, weight: .semibold))
                    .foregroundStyle(isSelected ? MESCColor.accent : MESCColor.textSecondary)
                Text(title)
                    .font(MESCFont.body)
                    .foregroundStyle(MESCColor.textPrimary)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
            .padding(13)
            .background(MESCColor.surface.opacity(isSelected ? 0.88 : 0.62), in: RoundedRectangle(cornerRadius: 15, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 15, style: .continuous)
                    .stroke(isSelected ? MESCColor.gold.opacity(0.34) : MESCColor.separator, lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }
}

struct QuestionnaireDraftAnswer: Equatable {
    var single: String?
    var multi: Set<String> = []
    var text = ""
    var bool: Bool?

    func isEmpty(for question: MobileQuestionnaireQuestionDTO) -> Bool {
        switch question.type.lowercased() {
        case "checkbox", "multiple_select", "multi_select":
            return multi.isEmpty
        case "boolean", "switch":
            return bool == nil
        case "text", "textarea", "long_text":
            return text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        default:
            return (single ?? "").isEmpty
        }
    }

    func answerValue(for question: MobileQuestionnaireQuestionDTO) -> JSONValue {
        switch question.type.lowercased() {
        case "checkbox", "multiple_select", "multi_select":
            return .array(multi.sorted().map { .string($0) })
        case "boolean", "switch":
            return .bool(bool ?? false)
        case "text", "textarea", "long_text":
            return .string(text.trimmingCharacters(in: .whitespacesAndNewlines))
        default:
            return .string(single ?? "")
        }
    }
}

enum ScheduleMode: String, CaseIterable, Identifiable {
    case mine = "Minha Escala"
    case month = "Mês"
    case full = "Escala Completa"

    var id: String { rawValue }
}

struct SchedulesScreen: View {
    @EnvironmentObject private var appModel: MESCNativeAppModel
    @State private var mode: ScheduleMode = .mine
    @State private var selectedDayNumber = Calendar.current.component(.day, from: Date())

    var body: some View {
        let days = appModel.scheduleDays(for: mode)
        let selectedDay = days.first(where: { $0.dayNumber == selectedDayNumber }) ?? days.first ?? ScheduleFixtures.days[0]

        MESCScrollScreen(title: "Escalas", subtitle: appModel.currentMonthLabel) {
            if appModel.isUsingFallbackData {
                FallbackBanner()
            }

            Picker("Modo de escala", selection: $mode) {
                ForEach(ScheduleMode.allCases) { mode in
                    Text(mode.rawValue).tag(mode)
                }
            }
            .pickerStyle(.segmented)
            .padding(.horizontal, 2)

            GlassPanel(spacing: 16) {
                HStack {
                    Button {
                        Task { await appModel.shiftScheduleMonth(by: -1) }
                    } label: {
                        Image(systemName: "chevron.left")
                    }
                    .buttonStyle(.plain)
                    .disabled(appModel.isLoading)

                    Spacer()
                    VStack(spacing: 2) {
                        Text(appModel.currentMonthLabel)
                            .font(MESCFont.cardTitle)
                        Text(mode.rawValue)
                            .font(MESCFont.caption)
                            .foregroundStyle(MESCColor.textSecondary)
                    }
                    Spacer()

                    Button {
                        Task { await appModel.shiftScheduleMonth(by: 1) }
                    } label: {
                        Image(systemName: "chevron.right")
                    }
                    .buttonStyle(.plain)
                    .disabled(appModel.isLoading)
                }
                .foregroundStyle(MESCColor.accent)

                CalendarMonthGrid(
                    monthDate: appModel.currentMonthStartDate,
                    days: days,
                    selectedDay: selectedDay,
                    onSelect: { selectedDayNumber = $0.dayNumber }
                )
            }

            GlassPanel(spacing: 14) {
                SectionTitle(title: selectedDay.formattedTitle, symbol: "calendar.badge.clock")

                if selectedDay.missions.isEmpty {
                    EmptyState(title: "Nenhuma missa para esta data", detail: "Toque em outra data para consultar a escala.")
                } else {
                    ForEach(selectedDay.missions) { mission in
                        ScheduleMissionRow(mission: mission, mode: mode)
                    }
                }

                MESCSecondaryButton(title: "Exportar lista no modelo oficial", symbol: "square.and.arrow.up")
            }
        }
    }
}

struct CalendarMonthGrid: View {
    let monthDate: Date
    let days: [ScheduleDay]
    let selectedDay: ScheduleDay
    let onSelect: (ScheduleDay) -> Void

    private let columns = Array(repeating: GridItem(.flexible(), spacing: 8), count: 7)
    private let weekdayLabels = ["D", "S", "T", "Q", "Q", "S", "S"]

    var body: some View {
        VStack(spacing: 10) {
            LazyVGrid(columns: columns, spacing: 8) {
                ForEach(weekdayLabels, id: \.self) { label in
                    Text(label)
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(MESCColor.textSecondary)
                        .frame(height: 22)
                }
            }

            LazyVGrid(columns: columns, spacing: 8) {
                ForEach(0..<leadingBlankDays, id: \.self) { _ in
                    Color.clear.frame(height: 42)
                }

                ForEach(days) { day in
                    Button {
                        onSelect(day)
                    } label: {
                        VStack(spacing: 3) {
                            Text("\(day.dayNumber)")
                                .font(.system(size: 16, weight: selectedDay.id == day.id ? .bold : .medium))
                            Circle()
                                .fill(day.missions.isEmpty ? Color.clear : MESCColor.gold)
                                .frame(width: 5, height: 5)
                        }
                        .frame(maxWidth: .infinity)
                        .frame(height: 42)
                        .foregroundStyle(selectedDay.id == day.id ? .white : MESCColor.textPrimary)
                        .background {
                            RoundedRectangle(cornerRadius: 12, style: .continuous)
                                .fill(selectedDay.id == day.id ? MESCColor.primaryWine : Color.clear)
                        }
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    private var leadingBlankDays: Int {
        let weekday = Calendar.current.component(.weekday, from: monthDate)
        return max(weekday - 1, 0)
    }
}

struct FormationScreen: View {
    @EnvironmentObject private var appModel: MESCNativeAppModel
    @State private var isLessonPresented = false

    var body: some View {
        MESCScrollScreen(title: "Formação", subtitle: "Trilhas e aulas") {
            if let overview = appModel.formationOverview {
                GlassPanel(spacing: 16) {
                    SectionTitle(title: "Seu progresso", symbol: "graduationcap")
                    HStack(spacing: 12) {
                        StatusPill(title: "\(overview.summary.completedLessons)/\(overview.summary.totalLessons) aulas", symbol: "checkmark.seal", tint: MESCColor.accent)
                        StatusPill(title: "\(overview.summary.percentageCompleted)% concluído", symbol: "chart.line.uptrend.xyaxis", tint: MESCColor.gold)
                    }
                    ProgressView(value: Double(overview.summary.percentageCompleted), total: 100)
                        .tint(MESCColor.accent)
                }

                if let next = overview.tracks.compactMap(\.nextLesson).first {
                    GlassPanel(spacing: 14) {
                        SectionTitle(title: "Continuar aprendendo", symbol: "play.circle")
                        Text(next.title)
                            .font(MESCFont.cardTitle)
                        Text("Aula \(next.lessonNumber)\(next.estimatedDuration.map { " - \($0) min" } ?? "")")
                            .font(MESCFont.body)
                            .foregroundStyle(MESCColor.textSecondary)
                        MESCPrimaryButton(
                            title: appModel.isLoadingFormationLesson ? "Abrindo..." : "Abrir aula",
                            symbol: "play.fill"
                        ) {
                            openLesson(next)
                        }
                        .disabled(appModel.isLoadingFormationLesson)
                    }
                }

                ForEach(overview.tracks) { track in
                    FormationTrackPanel(track: track, onOpenLesson: openLesson)
                }
            } else {
                GlassPanel(spacing: 14) {
                    SectionTitle(title: "Continuar aprendendo", symbol: "play.circle")
                    FormationLessonRow(title: "Ministério e espiritualidade", progress: 0.72, detail: "Módulo 1 - aula 3")
                    FormationLessonRow(title: "Rito da comunhão", progress: 0.38, detail: "Módulo 2 - aula 1")
                    FormationLessonRow(title: "Cuidado com enfermos", progress: 0.12, detail: "Vídeo disponível")
                }
            }

            if let message = appModel.formationMessage {
                Label(message, systemImage: message.contains("sucesso") ? "checkmark.seal" : "info.circle")
                    .font(MESCFont.caption)
                    .foregroundStyle(message.contains("sucesso") ? MESCColor.accent : MESCColor.primaryWine)
                    .fixedSize(horizontal: false, vertical: true)
            }

            GlassPanel(spacing: 14) {
                SectionTitle(title: "Área do coordenador", symbol: "plus.rectangle.on.folder")
                Text("Gerencie aulas, conteúdos, vídeos e progresso dos ministros.")
                    .font(MESCFont.body)
                    .foregroundStyle(MESCColor.textSecondary)
                HStack(spacing: 12) {
                    MESCPrimaryButton(title: "Nova aula", symbol: "plus")
                    MESCSecondaryButton(title: "Vídeos", symbol: "video")
                }
            }
        }
        .sheet(isPresented: $isLessonPresented, onDismiss: {
            appModel.formationLessonDetail = nil
        }) {
            FormationLessonSheet()
                .environmentObject(appModel)
        }
    }

    private func openLesson(_ lesson: MobileFormationLessonDTO) {
        Task {
            let didOpen = await appModel.openFormationLesson(lesson)
            if didOpen {
                isLessonPresented = true
            }
        }
    }
}

struct FormationTrackPanel: View {
    let track: MobileFormationTrackDTO
    let onOpenLesson: (MobileFormationLessonDTO) -> Void

    var body: some View {
        GlassPanel(spacing: 14) {
            VStack(alignment: .leading, spacing: 8) {
                SectionTitle(title: track.title, symbol: trackSymbol)
                if let description = track.description {
                    Text(description)
                        .font(MESCFont.body)
                        .foregroundStyle(MESCColor.textSecondary)
                        .fixedSize(horizontal: false, vertical: true)
                }
                HStack(spacing: 10) {
                    Text("\(track.stats.totalModules) módulos")
                    Text("\(track.stats.totalLessons) aulas")
                    Text("\(track.stats.progressPercentage)%")
                }
                .font(MESCFont.caption)
                .foregroundStyle(MESCColor.textSecondary)
                ProgressView(value: Double(track.stats.progressPercentage), total: 100)
                    .tint(MESCColor.accent)
            }

            ForEach(track.modules.prefix(3)) { module in
                FormationModuleRow(module: module, onOpenLesson: onOpenLesson)
            }
        }
    }

    private var trackSymbol: String {
        switch track.category {
        case "espiritualidade":
            return "sparkles"
        case "pratica", "prática":
            return "hands.sparkles"
        default:
            return "book.closed"
        }
    }
}

struct FormationModuleRow: View {
    let module: MobileFormationModuleDTO
    let onOpenLesson: (MobileFormationLessonDTO) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                VStack(alignment: .leading, spacing: 3) {
                    Text(module.title)
                        .font(MESCFont.body.weight(.semibold))
                    Text("\(module.stats.completedLessons)/\(module.stats.totalLessons) aulas concluídas")
                        .font(MESCFont.caption)
                        .foregroundStyle(MESCColor.textSecondary)
                }
                Spacer()
                Image(systemName: module.videoUrl == nil ? "chevron.right" : "play.rectangle")
                    .foregroundStyle(MESCColor.accent)
            }
            ProgressView(value: Double(module.stats.progressPercentage), total: 100)
                .tint(MESCColor.gold)

            ForEach(module.lessons.prefix(3)) { lesson in
                Button {
                    onOpenLesson(lesson)
                } label: {
                    HStack(spacing: 10) {
                        Image(systemName: lesson.progress?.status == "completed" ? "checkmark.circle.fill" : "play.circle")
                            .font(.system(size: 18, weight: .semibold))
                            .foregroundStyle(lesson.progress?.status == "completed" ? MESCColor.gold : MESCColor.accent)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(lesson.title)
                                .font(MESCFont.subheadline.weight(.semibold))
                                .foregroundStyle(MESCColor.textPrimary)
                                .lineLimit(2)
                            Text("Aula \(lesson.lessonNumber)\(lesson.estimatedDuration.map { " - \($0) min" } ?? "")")
                                .font(MESCFont.caption2)
                                .foregroundStyle(MESCColor.textSecondary)
                        }
                        Spacer()
                        Image(systemName: "chevron.right")
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundStyle(MESCColor.textSecondary)
                    }
                    .padding(.vertical, 8)
                }
                .buttonStyle(.plain)
            }
        }
        .padding(14)
        .background(MESCColor.surface.opacity(0.68), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
    }
}

struct FormationLessonSheet: View {
    @EnvironmentObject private var appModel: MESCNativeAppModel
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ZStack {
            MESCBackground()

            if let detail = appModel.formationLessonDetail {
                ScrollView(showsIndicators: false) {
                    VStack(alignment: .leading, spacing: 18) {
                        header(detail)

                        if let description = detail.lesson.description, !description.isEmpty {
                            Text(description.mescPlainText)
                                .font(MESCFont.body)
                                .foregroundStyle(MESCColor.textSecondary)
                                .fixedSize(horizontal: false, vertical: true)
                                .padding(.horizontal, 4)
                        }

                        if let videoUrl = detail.lesson.videoUrl, let url = URL(string: videoUrl), !videoUrl.isEmpty {
                            Link(destination: url) {
                                Label("Abrir vídeo da aula", systemImage: "play.rectangle.fill")
                                    .font(MESCFont.body.weight(.semibold))
                                    .frame(maxWidth: .infinity, alignment: .leading)
                                    .padding(14)
                                    .mescGlass(cornerRadius: 16)
                            }
                            .foregroundStyle(MESCColor.accent)
                        }

                        ForEach(detail.sections) { section in
                            FormationLessonSectionCard(section: section)
                        }

                        if detail.sections.isEmpty {
                            EmptyState(title: "Conteúdo em preparação", detail: "A coordenação ainda não publicou seções para esta aula.")
                        }

                        if let message = appModel.formationMessage {
                            Label(message, systemImage: message.contains("sucesso") ? "checkmark.seal" : "info.circle")
                                .font(MESCFont.caption)
                                .foregroundStyle(message.contains("sucesso") ? MESCColor.accent : MESCColor.primaryWine)
                                .fixedSize(horizontal: false, vertical: true)
                        }

                        MESCPrimaryButton(
                            title: completeButtonTitle(for: detail),
                            symbol: detail.progress.status == "completed" ? "checkmark.seal.fill" : "checkmark.circle"
                        ) {
                            Task { await appModel.completeCurrentFormationLesson() }
                        }
                        .disabled(appModel.isCompletingFormationLesson || detail.progress.status == "completed")
                    }
                    .padding(.horizontal, 18)
                    .padding(.top, 20)
                    .padding(.bottom, 34)
                }
            } else {
                EmptyState(title: "Aula não carregada", detail: "Toque em uma aula novamente.")
                    .padding(24)
            }
        }
    }

    private func header(_ detail: MobileFormationLessonDetailDTO) -> some View {
        GlassPanel(spacing: 12) {
            HStack(alignment: .top, spacing: 12) {
                SymbolTile(symbol: detail.progress.status == "completed" ? "checkmark.seal" : "play.circle", tint: MESCColor.gold)
                VStack(alignment: .leading, spacing: 6) {
                    Text("Aula \(detail.lesson.lessonNumber)")
                        .font(MESCFont.caption)
                        .foregroundStyle(MESCColor.accent)
                    Text(detail.lesson.title)
                        .font(MESCFont.title2)
                        .fixedSize(horizontal: false, vertical: true)
                    HStack(spacing: 10) {
                        Text(progressLabel(detail.progress))
                        if let duration = detail.lesson.estimatedDuration {
                            Text("\(duration) min")
                        }
                    }
                    .font(MESCFont.caption)
                    .foregroundStyle(MESCColor.textSecondary)
                    ProgressView(value: Double(detail.progress.progressPercentage), total: 100)
                        .tint(MESCColor.gold)
                }
                Spacer()
                Button {
                    dismiss()
                } label: {
                    Image(systemName: "xmark")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundStyle(MESCColor.textPrimary)
                        .frame(width: 34, height: 34)
                        .background(MESCColor.surface.opacity(0.72), in: Circle())
                }
                .buttonStyle(.plain)
            }
        }
    }

    private func completeButtonTitle(for detail: MobileFormationLessonDetailDTO) -> String {
        if appModel.isCompletingFormationLesson {
            return "Concluindo..."
        }
        return detail.progress.status == "completed" ? "Aula concluída" : "Marcar como concluída"
    }

    private func progressLabel(_ progress: MobileFormationProgressDTO) -> String {
        switch progress.status {
        case "completed":
            return "Concluída"
        case "in_progress":
            return "\(progress.progressPercentage)% concluída"
        default:
            return "Não iniciada"
        }
    }
}

struct FormationLessonSectionCard: View {
    let section: MobileFormationLessonSectionDTO

    var body: some View {
        GlassPanel(spacing: 10) {
            SectionTitle(title: section.title, symbol: sectionSymbol)

            if let content = section.content, !content.isEmpty {
                Text(content.mescPlainText)
                    .font(MESCFont.body)
                    .foregroundStyle(MESCColor.textPrimary)
                    .fixedSize(horizontal: false, vertical: true)
            }

            HStack(spacing: 10) {
                if let minutes = section.estimatedMinutes {
                    Label("\(minutes) min", systemImage: "clock")
                }
                if let videoUrl = section.videoUrl, let url = URL(string: videoUrl), !videoUrl.isEmpty {
                    Link(destination: url) {
                        Label("Vídeo", systemImage: "play.rectangle")
                    }
                }
                if let documentUrl = section.documentUrl, let url = URL(string: documentUrl), !documentUrl.isEmpty {
                    Link(destination: url) {
                        Label("Material", systemImage: "doc.text")
                    }
                }
            }
            .font(MESCFont.caption)
            .foregroundStyle(MESCColor.accent)
        }
    }

    private var sectionSymbol: String {
        switch section.contentType?.lowercased() {
        case "video":
            return "play.rectangle"
        case "quiz":
            return "questionmark.circle"
        case "audio":
            return "waveform"
        default:
            return "text.book.closed"
        }
    }
}

struct ProfileScreen: View {
    @EnvironmentObject private var appModel: MESCNativeAppModel

    var body: some View {
        let name = appModel.user?.name ?? "Ministro"
        let email = appModel.user?.email ?? "E-mail não carregado"
        let initials = name
            .split(separator: " ")
            .prefix(2)
            .compactMap { $0.first }
            .map(String.init)
            .joined()
            .uppercased()

        MESCScrollScreen(title: "Perfil", subtitle: "Dados do ministro") {
            GlassPanel(spacing: 16) {
                HStack(spacing: 14) {
                    Circle()
                        .fill(
                            LinearGradient(
                                colors: [MESCColor.primaryWine, MESCColor.primaryRed],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .frame(width: 64, height: 64)
                        .overlay(Text(initials.isEmpty ? "M" : initials).font(.system(size: 22, weight: .bold)).foregroundStyle(.white))

                    VStack(alignment: .leading, spacing: 4) {
                        Text(name)
                            .font(MESCFont.cardTitle)
                        Text("\(appModel.user?.role.capitalized ?? "Ministro") - \(appModel.activeCommunity?.name ?? "Comunidade")")
                            .font(MESCFont.body)
                            .foregroundStyle(MESCColor.textSecondary)
                    }
                    Spacer()
                }

                ProfileInfoRow(title: "Email", value: email)
                ProfileInfoRow(title: "Comunidade", value: appModel.activeCommunity?.name ?? "Não carregada")
                ProfileInfoRow(title: "Paróquia", value: appModel.activeCommunity?.parishName ?? "São Judas Tadeu")
            }
        }
    }
}

struct SettingsScreen: View {
    @EnvironmentObject private var appModel: MESCNativeAppModel
    @State private var emailEnabled = true
    @State private var biometricEnabled = true
    @State private var cameraEnabled = false
    @State private var locationEnabled = false

    var body: some View {
        MESCScrollScreen(title: "Ajustes", subtitle: "Permissões e preferências") {
            GlassPanel(spacing: 16) {
                SectionTitle(title: "Central do aparelho", symbol: "iphone")
                NativePermissionRow(
                    title: "Notificações push",
                    detail: "Escala, questionário, substituições e avisos.",
                    status: appModel.pushStatusText,
                    symbol: "bell",
                    isEnabled: appModel.pushEnabled
                ) {
                    Task { await appModel.requestPushNotifications() }
                }
                if let message = appModel.pushPermissionMessage {
                    Label(message, systemImage: "info.circle")
                        .font(MESCFont.caption)
                        .foregroundStyle(MESCColor.textSecondary)
                        .fixedSize(horizontal: false, vertical: true)
                }
                SettingsToggleRow(title: "Biometria", detail: "Usar Face ID ou Touch ID depois do login.", symbol: "faceid", isOn: $biometricEnabled)
                SettingsToggleRow(title: "Camera e fotos", detail: "Foto de perfil e anexos autorizados.", symbol: "camera", isOn: $cameraEnabled)
                SettingsToggleRow(title: "Localização", detail: "Somente para fluxos pastorais aprovados.", symbol: "location", isOn: $locationEnabled)
            }

            GlassPanel(spacing: 16) {
                SectionTitle(title: "Preferencias", symbol: "slider.horizontal.3")
                SettingsToggleRow(title: "E-mail", detail: "Receber lembretes tambem por e-mail.", symbol: "envelope", isOn: $emailEnabled)
                NotificationTypeRow(title: "Novo questionario", enabled: true)
                NotificationTypeRow(title: "Escala publicada", enabled: true)
                NotificationTypeRow(title: "Substituto aceitou", enabled: true)
                NotificationTypeRow(title: "Novo treinamento", enabled: true)
            }

            HStack(spacing: 12) {
                MESCSecondaryButton(title: "Atualizar", symbol: "arrow.clockwise") {
                    Task { await appModel.reload() }
                }
                MESCSecondaryButton(title: "Sair", symbol: "rectangle.portrait.and.arrow.right") {
                    appModel.signOut()
                }
            }
        }
        .task {
            await appModel.refreshDevicePermissions()
        }
    }
}

struct MESCScrollScreen<Content: View>: View {
    let title: String
    let subtitle: String
    @ViewBuilder let content: Content

    var body: some View {
        ScrollView(showsIndicators: false) {
            VStack(alignment: .leading, spacing: 18) {
                HStack(alignment: .center, spacing: 12) {
                    VStack(alignment: .leading, spacing: 5) {
                        Text(subtitle)
                            .font(MESCFont.caption)
                            .foregroundStyle(MESCColor.accent)
                        Text(title)
                            .font(MESCFont.screenTitle)
                            .foregroundStyle(MESCColor.textPrimary)
                    }

                    Spacer()

                    Image(systemName: "cross.case.fill")
                        .font(.system(size: 24, weight: .semibold))
                        .foregroundStyle(MESCColor.gold)
                        .frame(width: 44, height: 44)
                        .mescGlass(cornerRadius: 16)
                }
                .padding(.top, 20)

                content
            }
            .padding(.horizontal, 18)
            .padding(.bottom, 28)
        }
    }
}

struct MESCLogoMark: View {
    let size: CGFloat
    let cornerRadius: CGFloat

    var body: some View {
        Image("Splash")
            .resizable()
            .scaledToFill()
            .frame(width: size, height: size)
            .clipShape(RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    .stroke(Color.white.opacity(0.34), lineWidth: 1)
            )
            .shadow(color: MESCColor.gold.opacity(0.24), radius: 28, x: 0, y: 14)
    }
}

struct GlassPanel<Content: View>: View {
    var spacing: CGFloat = 12
    @ViewBuilder let content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: spacing) {
            content
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(18)
        .mescGlass(cornerRadius: 22)
    }
}

struct SectionTitle: View {
    let title: String
    let symbol: String

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: symbol)
                .foregroundStyle(MESCColor.accent)
            Text(title)
                .font(MESCFont.cardTitle)
        }
        .foregroundStyle(MESCColor.textPrimary)
    }
}

struct SymbolTile: View {
    let symbol: String
    let tint: Color

    var body: some View {
        Image(systemName: symbol)
            .font(.system(size: 20, weight: .semibold))
            .foregroundStyle(tint)
            .frame(width: 44, height: 44)
            .background(tint.opacity(0.12), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
    }
}

struct StatusPill: View {
    let title: String
    let symbol: String
    let tint: Color

    var body: some View {
        Label(title, systemImage: symbol)
            .font(.system(size: 13, weight: .semibold))
            .foregroundStyle(tint)
            .lineLimit(1)
            .minimumScaleFactor(0.8)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
            .padding(.horizontal, 10)
            .mescGlass(cornerRadius: 16)
    }
}

struct MissionRow: View {
    let time: String
    let title: String
    let detail: String

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Text(time)
                .font(.system(size: 14, weight: .bold, design: .rounded))
                .foregroundStyle(MESCColor.accent)
                .frame(width: 48, alignment: .leading)

            VStack(alignment: .leading, spacing: 3) {
                Text(title)
                    .font(MESCFont.body.weight(.semibold))
                Text(detail)
                    .font(MESCFont.caption)
                    .foregroundStyle(MESCColor.textSecondary)
            }
        }
    }
}

struct ScheduleMissionRow: View {
    let mission: ScheduleMission
    let mode: ScheduleMode

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .firstTextBaseline) {
                Text(mission.time)
                    .font(.system(size: 17, weight: .bold, design: .rounded))
                    .foregroundStyle(MESCColor.accent)
                Spacer()
                Text(mission.community)
                    .font(MESCFont.caption)
                    .foregroundStyle(MESCColor.textSecondary)
            }

            Text(mission.title)
                .font(MESCFont.cardTitle)

            if mode == .full {
                Text(mission.ministers.joined(separator: " | "))
                    .font(MESCFont.body)
                    .foregroundStyle(MESCColor.textSecondary)
            } else {
                Text(mission.role)
                    .font(MESCFont.body)
                    .foregroundStyle(MESCColor.textSecondary)
            }
        }
        .padding(14)
        .background(MESCColor.surface.opacity(0.72), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(MESCColor.gold.opacity(0.14), lineWidth: 1)
        )
    }
}

struct FormationLessonRow: View {
    let title: String
    let progress: Double
    let detail: String

    var body: some View {
        VStack(alignment: .leading, spacing: 9) {
            HStack {
                VStack(alignment: .leading, spacing: 3) {
                    Text(title)
                        .font(MESCFont.body.weight(.semibold))
                    Text(detail)
                        .font(MESCFont.caption)
                        .foregroundStyle(MESCColor.textSecondary)
                }
                Spacer()
                Image(systemName: "chevron.right")
                    .foregroundStyle(MESCColor.accent)
            }

            ProgressView(value: progress)
                .tint(MESCColor.accent)
        }
        .padding(14)
        .background(MESCColor.surface.opacity(0.68), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
    }
}

struct ProfileInfoRow: View {
    let title: String
    let value: String

    var body: some View {
        HStack {
            Text(title)
                .font(MESCFont.body)
                .foregroundStyle(MESCColor.textSecondary)
            Spacer()
            Text(value)
                .font(MESCFont.body.weight(.semibold))
                .multilineTextAlignment(.trailing)
        }
    }
}

struct SettingsToggleRow: View {
    let title: String
    let detail: String
    let symbol: String
    @Binding var isOn: Bool

    var body: some View {
        HStack(alignment: .center, spacing: 12) {
            SymbolTile(symbol: symbol, tint: isOn ? MESCColor.accent : MESCColor.textSecondary)

            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(MESCFont.body.weight(.semibold))
                Text(detail)
                    .font(MESCFont.caption)
                    .foregroundStyle(MESCColor.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
            }

            Spacer()

            Toggle("", isOn: $isOn)
                .labelsHidden()
        }
        .padding(12)
        .background(MESCColor.surface.opacity(0.68), in: RoundedRectangle(cornerRadius: 18, style: .continuous))
    }
}

struct NativePermissionRow: View {
    let title: String
    let detail: String
    let status: String
    let symbol: String
    let isEnabled: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(alignment: .center, spacing: 12) {
                SymbolTile(symbol: symbol, tint: isEnabled ? MESCColor.accent : MESCColor.textSecondary)

                VStack(alignment: .leading, spacing: 4) {
                    Text(title)
                        .font(MESCFont.body.weight(.semibold))
                    Text(detail)
                        .font(MESCFont.caption)
                        .foregroundStyle(MESCColor.textSecondary)
                        .fixedSize(horizontal: false, vertical: true)
                    Text(status)
                        .font(MESCFont.caption2)
                        .foregroundStyle(isEnabled ? MESCColor.gold : MESCColor.accent)
                }

                Spacer()

                Image(systemName: isEnabled ? "checkmark.circle.fill" : "chevron.right")
                    .font(.system(size: 22, weight: .semibold))
                    .foregroundStyle(isEnabled ? MESCColor.gold : MESCColor.textSecondary)
            }
            .padding(12)
            .background(MESCColor.surface.opacity(0.68), in: RoundedRectangle(cornerRadius: 18, style: .continuous))
        }
        .buttonStyle(.plain)
    }
}

struct NotificationTypeRow: View {
    let title: String
    let enabled: Bool

    var body: some View {
        HStack {
            Circle()
                .fill(enabled ? MESCColor.gold : MESCColor.textSecondary.opacity(0.3))
                .frame(width: 8, height: 8)
            Text(title)
                .font(MESCFont.body)
            Spacer()
            Text(enabled ? "Ativo" : "Inativo")
                .font(MESCFont.caption)
                .foregroundStyle(MESCColor.textSecondary)
        }
    }
}

struct EmptyState: View {
    let title: String
    let detail: String

    var body: some View {
        VStack(alignment: .center, spacing: 8) {
            Image(systemName: "calendar.badge.exclamationmark")
                .font(.system(size: 26, weight: .semibold))
                .foregroundStyle(MESCColor.gold)
            Text(title)
                .font(MESCFont.body.weight(.semibold))
            Text(detail)
                .font(MESCFont.caption)
                .foregroundStyle(MESCColor.textSecondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 20)
    }
}

struct FallbackBanner: View {
    var body: some View {
        Label("Dados locais temporários. Toque em Atualizar nos Ajustes para tentar sincronizar novamente.", systemImage: "wifi.exclamationmark")
            .font(MESCFont.caption)
            .foregroundStyle(MESCColor.primaryWine)
            .fixedSize(horizontal: false, vertical: true)
            .padding(14)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(MESCColor.gold.opacity(0.12), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .stroke(MESCColor.gold.opacity(0.24), lineWidth: 1)
            )
    }
}

struct MESCPrimaryButton: View {
    let title: String
    let symbol: String
    let action: () -> Void

    init(title: String, symbol: String, action: @escaping () -> Void = {}) {
        self.title = title
        self.symbol = symbol
        self.action = action
    }

    var body: some View {
        Button(action: action) {
            Label(title, systemImage: symbol)
                .font(.system(size: 15, weight: .bold))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .foregroundStyle(.white)
                .background(MESCColor.primaryWine, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
        }
        .buttonStyle(.plain)
    }
}

struct MESCSecondaryButton: View {
    let title: String
    let symbol: String
    let action: () -> Void

    init(title: String, symbol: String, action: @escaping () -> Void = {}) {
        self.title = title
        self.symbol = symbol
        self.action = action
    }

    var body: some View {
        Button(action: action) {
            Label(title, systemImage: symbol)
                .font(.system(size: 15, weight: .semibold))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 13)
                .foregroundStyle(MESCColor.accent)
                .background(MESCColor.surface.opacity(0.66), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                        .stroke(MESCColor.gold.opacity(0.24), lineWidth: 1)
                )
        }
        .buttonStyle(.plain)
    }
}

struct MESCBackground: View {
    var body: some View {
        LinearGradient(
            colors: [
                MESCColor.background,
                MESCColor.background,
                MESCColor.ivoryWarm
            ],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
        .ignoresSafeArea()
    }
}

extension View {
    @ViewBuilder
    func mescGlass(cornerRadius: CGFloat) -> some View {
        if #available(iOS 26.0, *) {
            GlassEffectContainer(spacing: 10) {
                self
                    .background(MESCColor.glassBase, in: RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
                    .glassEffect(
                        .regular
                            .tint(MESCColor.glassTint)
                            .interactive(),
                        in: RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    )
                    .overlay(glassBorder(cornerRadius: cornerRadius))
                    .shadow(color: MESCColor.primaryWine.opacity(0.13), radius: 28, x: 0, y: 14)
            }
        } else {
            self
                .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
                .background(MESCColor.glassBase, in: RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
                .overlay(glassBorder(cornerRadius: cornerRadius))
                .shadow(color: MESCColor.primaryWine.opacity(0.10), radius: 22, x: 0, y: 10)
        }
    }

    private func glassBorder(cornerRadius: CGFloat) -> some View {
        RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
            .strokeBorder(
                LinearGradient(
                    colors: [
                        Color.white.opacity(0.42),
                        MESCColor.gold.opacity(0.22),
                        Color.white.opacity(0.12)
                    ],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                ),
                lineWidth: 1
            )
    }
}

enum MESCColor {
    static let primaryRed = Color(hex: 0x8B0000)
    static let primaryWine = Color(hex: 0x722F37)
    static let accent = dynamic(light: 0x722F37, dark: 0xC5A059)
    static let gold = Color(hex: 0xC5A059)
    static let goldMuted = Color(hex: 0xB38F4D)
    static let background = dynamic(light: 0xFDFBF7, dark: 0x1A1A1A)
    static let ivoryWarm = dynamic(light: 0xF6EFE2, dark: 0x1C1C1E)
    static let graphite = Color(hex: 0x1A1A1A)
    static let textPrimary = dynamic(light: 0x1A1A1A, dark: 0xEDEDED)
    static let textSecondary = dynamic(light: 0x727272, dark: 0x8A8A8A)
    static let surface = dynamic(light: 0xFFFFFF, dark: 0x1C1C1E, lightAlpha: 0.74, darkAlpha: 0.74)
    static let glassBase = dynamic(light: 0xFFFFFF, dark: 0x1C1C1E, lightAlpha: 0.12, darkAlpha: 0.18)
    static let glassTint = dynamic(light: 0xFFFFFF, dark: 0xEDEDED, lightAlpha: 0.08, darkAlpha: 0.04)
    static let separator = dynamic(light: 0x000000, dark: 0xFFFFFF, lightAlpha: 0.12, darkAlpha: 0.12)

    private static func dynamic(light: UInt, dark: UInt, lightAlpha: Double = 1, darkAlpha: Double = 1) -> Color {
        Color(
            UIColor { traits in
                let hex = traits.userInterfaceStyle == .dark ? dark : light
                let alpha = traits.userInterfaceStyle == .dark ? darkAlpha : lightAlpha
                return UIColor(hex: hex, alpha: alpha)
            }
        )
    }
}

enum MESCFont {
    static let screenTitle = Font.system(size: 34, weight: .bold)
    static let titleSerif = Font.system(size: 28, weight: .bold)
    static let title2 = Font.system(size: 22, weight: .bold)
    static let cardTitle = Font.system(size: 17, weight: .semibold)
    static let body = Font.system(size: 17, weight: .regular)
    static let callout = Font.system(size: 16, weight: .regular)
    static let subheadline = Font.system(size: 15, weight: .regular)
    static let caption = Font.system(size: 13, weight: .medium)
    static let caption2 = Font.system(size: 11, weight: .medium)
}

extension Color {
    init(hex: UInt, alpha: Double = 1) {
        self.init(
            .sRGB,
            red: Double((hex >> 16) & 0xff) / 255,
            green: Double((hex >> 8) & 0xff) / 255,
            blue: Double(hex & 0xff) / 255,
            opacity: alpha
        )
    }
}

extension String {
    var mescPlainText: String {
        guard contains("<") || contains("&") else { return self }

        if let data = data(using: .utf8),
           let attributed = try? NSAttributedString(
            data: data,
            options: [
                .documentType: NSAttributedString.DocumentType.html,
                .characterEncoding: String.Encoding.utf8.rawValue,
            ],
            documentAttributes: nil
           ) {
            return attributed.string.trimmingCharacters(in: .whitespacesAndNewlines)
        }

        return replacingOccurrences(of: "<[^>]+>", with: " ", options: .regularExpression)
            .replacingOccurrences(of: "&nbsp;", with: " ")
            .replacingOccurrences(of: "&amp;", with: "&")
            .replacingOccurrences(of: "&quot;", with: "\"")
            .replacingOccurrences(of: "&#39;", with: "'")
            .components(separatedBy: .whitespacesAndNewlines)
            .filter { !$0.isEmpty }
            .joined(separator: " ")
            .trimmingCharacters(in: .whitespacesAndNewlines)
    }
}

extension UIColor {
    convenience init(hex: UInt, alpha: Double = 1) {
        self.init(
            red: CGFloat((hex >> 16) & 0xff) / 255,
            green: CGFloat((hex >> 8) & 0xff) / 255,
            blue: CGFloat(hex & 0xff) / 255,
            alpha: alpha
        )
    }
}

enum MESCMobileAPIError: LocalizedError {
    case invalidBaseURL
    case unauthenticated
    case server(status: Int, message: String)
    case decoding(Error)
    case transport(Error)

    var errorDescription: String? {
        switch self {
        case .invalidBaseURL:
            return "Configuração da API inválida."
        case .unauthenticated:
            return "Sessão expirada. Entre novamente."
        case let .server(_, message):
            return message
        case .decoding:
            return "A API respondeu em um formato inesperado."
        case .transport:
            return "Não foi possível conectar ao servidor."
        }
    }
}

struct MobileErrorBodyDTO: Decodable {
    let message: String?
    let error: String?
    let code: String?
}

struct MobileAuthResponseDTO: Codable {
    let success: Bool
    let auth: MobileAuthDTO
    let user: MobileUserDTO
    let communities: [MobileCommunityDTO]
    let activeCommunityId: String
    let device: MobileDeviceDTO?
}

struct MobileAuthDTO: Codable {
    let tokenType: String
    let accessToken: String
    let refreshToken: String?
    let refreshTokenExpiresAt: String?
    let sessionToken: String?
    let expiresInSeconds: Int?
    let keepSignedIn: Bool
}

struct MobileUserDTO: Codable, Identifiable {
    let id: String
    let email: String
    let name: String
    let role: String
    let homeCommunityId: String
    let requiresPasswordChange: Bool
    let photoUrl: String?
}

struct MobileCommunityDTO: Codable, Identifiable {
    let id: String
    let name: String
    let slug: String?
    let colorHex: String?
    let parishName: String?
    let isMatriz: Bool?
}

struct MobileDeviceDTO: Codable {
    let id: String?
    let deviceId: String?
    let platform: String?
    let appVersion: String?
    let pushEnabled: Bool?
    let biometricCapable: Bool?
    let biometricEnabled: Bool?
    let registered: Bool?
}

enum JSONValue: Codable, Equatable {
    case string(String)
    case bool(Bool)
    case number(Double)
    case array([JSONValue])
    case object([String: JSONValue])
    case null

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if container.decodeNil() {
            self = .null
        } else if let value = try? container.decode(Bool.self) {
            self = .bool(value)
        } else if let value = try? container.decode(Double.self) {
            self = .number(value)
        } else if let value = try? container.decode(String.self) {
            self = .string(value)
        } else if let value = try? container.decode([JSONValue].self) {
            self = .array(value)
        } else if let value = try? container.decode([String: JSONValue].self) {
            self = .object(value)
        } else {
            self = .null
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        switch self {
        case let .string(value):
            try container.encode(value)
        case let .bool(value):
            try container.encode(value)
        case let .number(value):
            try container.encode(value)
        case let .array(value):
            try container.encode(value)
        case let .object(value):
            try container.encode(value)
        case .null:
            try container.encodeNil()
        }
    }
}

struct MobileMissionHomeDTO: Codable {
    let success: Bool
    let user: MobileUserDTO
    let community: MobileCommunityDTO
    let nextMission: MobileMissionScheduleDTO?
    let pendingActions: [MobilePendingActionDTO]
    let monthlySummary: MobileMonthlySummaryDTO
    let notices: [MobileNoticeDTO]
    let sync: MobileSyncDTO
}

struct MobileMissionScheduleDTO: Codable {
    let id: String
    let date: String?
    let time: String
    let type: String
    let location: String?
    let position: Int?
    let status: String
    let notes: String?
    let confirmationStatus: String?
    let canConfirm: Bool?
    let canRequestSubstitution: Bool?
    let deepLink: String
}

struct MobilePendingActionDTO: Codable, Identifiable {
    let id: String
    let type: String
    let title: String
    let subtitle: String?
    let priority: String
    let deepLink: String
    let dueAt: String?
}

struct MobileMonthlySummaryDTO: Codable {
    let month: String
    let publishedAssignments: Int
    let nextScheduleId: String?
}

struct MobileNoticeDTO: Codable, Identifiable {
    let id: String
    let type: String
    let eventKey: String?
    let title: String
    let message: String
    let priority: String?
    let read: Bool
    let deepLink: String
    let createdAt: String?
}

struct MobileSyncDTO: Codable {
    let serverTime: String
    let cacheMaxAgeSeconds: Int
}

struct MobileScheduleMonthDTO: Codable {
    let success: Bool
    let community: MobileCommunityDTO
    let month: String
    let schedules: [MobileMissionScheduleDTO]
    let publicSchedule: MobilePublicScheduleMonthDTO
}

struct MobilePublicScheduleMonthDTO: Codable {
    let assignments: [MobilePublicScheduleAssignmentDTO]
    let exportFormats: [String]
}

struct MobilePublicScheduleAssignmentDTO: Codable, Identifiable {
    let id: String
    let scheduleId: String
    let date: String
    let time: String
    let type: String
    let location: String?
    let position: Int
    let status: String
    let notes: String?
    let ministerId: String?
    let ministerName: String?
    let scheduleDisplayName: String?
    let source: String
    let isCurrentUser: Bool
}

struct MobileQuestionnaireCurrentDTO: Codable {
    let success: Bool
    let community: MobileCommunityDTO
    let month: String
    let questionnaire: MobileQuestionnaireDTO?
}

struct MobileQuestionnaireDTO: Codable, Identifiable {
    let id: String
    let title: String
    let description: String?
    let month: Int
    let year: Int
    let status: String
    let questions: [MobileQuestionnaireQuestionDTO]
    let deadline: String?
    let responseStatus: String
    let response: MobileQuestionnaireExistingResponseDTO?

    enum CodingKeys: String, CodingKey {
        case id
        case title
        case description
        case month
        case year
        case status
        case questions
        case deadline
        case responseStatus
        case response
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        title = try container.decode(String.self, forKey: .title)
        description = try container.decodeIfPresent(String.self, forKey: .description)
        month = try container.decode(Int.self, forKey: .month)
        year = try container.decode(Int.self, forKey: .year)
        status = try container.decode(String.self, forKey: .status)
        questions = (try? container.decode([MobileQuestionnaireQuestionDTO].self, forKey: .questions)) ?? []
        deadline = try container.decodeIfPresent(String.self, forKey: .deadline)
        responseStatus = try container.decode(String.self, forKey: .responseStatus)
        response = try container.decodeIfPresent(MobileQuestionnaireExistingResponseDTO.self, forKey: .response)
    }
}

struct MobileQuestionnaireQuestionDTO: Codable, Identifiable {
    let id: String
    let type: String
    let title: String
    let options: [String]?
    let required: Bool?
    let metadata: JSONValue?
}

struct MobileQuestionnaireExistingResponseDTO: Codable {
    let id: String
    let responses: JSONValue?
    let submittedAt: String?
    let updatedAt: String?
}

struct MobileQuestionnaireAnswerDTO: Codable, Equatable {
    let questionId: String
    let answer: JSONValue
    let metadata: JSONValue?

    init(questionId: String, answer: JSONValue, metadata: JSONValue? = nil) {
        self.questionId = questionId
        self.answer = answer
        self.metadata = metadata
    }
}

struct MobileQuestionnaireSubmitResponseDTO: Codable {
    let success: Bool
    let response: MobileQuestionnaireSavedResponseDTO
}

struct MobileQuestionnaireSavedResponseDTO: Codable {
    let id: String
    let questionnaireId: String
    let submittedAt: String?
    let updatedAt: String?
    let processingWarnings: [JSONValue]?
    let unmappedResponses: [JSONValue]?
}

struct MobileFormationOverviewResponseDTO: Codable {
    let success: Bool
    let overview: MobileFormationOverviewDTO
}

struct MobileFormationOverviewDTO: Codable {
    let tracks: [MobileFormationTrackDTO]
    let summary: MobileFormationSummaryDTO
}

struct MobileFormationSummaryDTO: Codable {
    let totalTracks: Int
    let totalModules: Int
    let totalLessons: Int
    let completedLessons: Int
    let inProgressLessons: Int
    let percentageCompleted: Int
    let lastUpdated: String?
}

struct MobileFormationTrackDTO: Codable, Identifiable {
    let id: String
    let title: String
    let description: String?
    let category: String?
    let modules: [MobileFormationModuleDTO]
    let stats: MobileFormationTrackStatsDTO
    let nextLesson: MobileFormationLessonDTO?
}

struct MobileFormationTrackStatsDTO: Codable {
    let totalModules: Int
    let totalLessons: Int
    let completedLessons: Int
    let inProgressLessons: Int
    let progressPercentage: Int
}

struct MobileFormationModuleDTO: Codable, Identifiable {
    let id: String
    let trackId: String?
    let title: String
    let description: String?
    let durationMinutes: Int?
    let videoUrl: String?
    let lessons: [MobileFormationLessonDTO]
    let stats: MobileFormationModuleStatsDTO
}

struct MobileFormationModuleStatsDTO: Codable {
    let totalLessons: Int
    let completedLessons: Int
    let inProgressLessons: Int
    let progressPercentage: Int
}

struct MobileFormationLessonDTO: Codable, Identifiable {
    let id: String
    let moduleId: String
    let trackId: String?
    let title: String
    let description: String?
    let lessonNumber: Int
    let estimatedDuration: Int?
    let videoUrl: String?
    let progress: MobileFormationProgressDTO?
}

struct MobileFormationLessonDetailDTO: Codable, Identifiable {
    let success: Bool
    let lesson: MobileFormationLessonDetailInfoDTO
    let sections: [MobileFormationLessonSectionDTO]
    let progress: MobileFormationProgressDTO

    var id: String { lesson.id }

    func withProgress(_ newProgress: MobileFormationProgressDTO) -> MobileFormationLessonDetailDTO {
        MobileFormationLessonDetailDTO(
            success: success,
            lesson: lesson,
            sections: sections,
            progress: newProgress
        )
    }
}

struct MobileFormationLessonDetailInfoDTO: Codable, Identifiable {
    let id: String
    let moduleId: String
    let trackId: String?
    let title: String
    let description: String?
    let lessonNumber: Int
    let estimatedDuration: Int?
    let contentType: String?
    let contentUrl: String?
    let videoUrl: String?
    let documentUrl: String?
}

struct MobileFormationLessonSectionDTO: Codable, Identifiable {
    let id: String
    let title: String
    let content: String?
    let contentType: String?
    let orderIndex: Int
    let videoUrl: String?
    let audioUrl: String?
    let documentUrl: String?
    let estimatedMinutes: Int?
    let quizData: JSONValue?
    let interactiveData: JSONValue?
}

struct MobileFormationProgressDTO: Codable {
    let status: String
    let progressPercentage: Int
    let timeSpent: Int?
    let completedSections: [String]?
}

struct MobileFormationLessonCompleteResponseDTO: Codable {
    let success: Bool
    let progress: MobileFormationProgressDTO
}

final class MESCMobileAPIClient {
    private let baseURL: URL
    private let decoder: JSONDecoder
    private let encoder: JSONEncoder

    init() {
        let value = Bundle.main.object(forInfoDictionaryKey: "MESCAPIBaseURL") as? String
        self.baseURL = URL(string: value ?? "") ?? URL(string: "https://saojudastadeu.app/api/mobile/v1")!
        self.decoder = JSONDecoder()
        self.encoder = JSONEncoder()
    }

    func login(
        email: String,
        password: String,
        keepSignedIn: Bool,
        deviceId: String,
        appVersion: String?
    ) async throws -> MobileAuthResponseDTO {
        try await post(
            "auth/login",
            body: LoginRequestBody(
                email: email,
                password: password,
                keepSignedIn: keepSignedIn,
                deviceId: deviceId,
                platform: "ios",
                appVersion: appVersion
            )
        )
    }

    func refresh(refreshToken: String, deviceId: String) async throws -> MobileAuthResponseDTO {
        try await post(
            "auth/refresh",
            body: RefreshRequestBody(refreshToken: refreshToken, deviceId: deviceId)
        )
    }

    func missionHome(
        accessToken: String,
        communityId: String?,
        deviceId: String,
        month: String
    ) async throws -> MobileMissionHomeDTO {
        try await get(
            "mission/home",
            accessToken: accessToken,
            communityId: communityId,
            deviceId: deviceId,
            queryItems: [URLQueryItem(name: "month", value: month)]
        )
    }

    func scheduleMonth(
        accessToken: String,
        communityId: String?,
        deviceId: String,
        month: String
    ) async throws -> MobileScheduleMonthDTO {
        try await get(
            "schedules/month",
            accessToken: accessToken,
            communityId: communityId,
            deviceId: deviceId,
            queryItems: [URLQueryItem(name: "month", value: month)]
        )
    }

    func currentQuestionnaire(
        accessToken: String,
        communityId: String?,
        deviceId: String,
        month: String
    ) async throws -> MobileQuestionnaireCurrentDTO {
        try await get(
            "questionnaires/current",
            accessToken: accessToken,
            communityId: communityId,
            deviceId: deviceId,
            queryItems: [URLQueryItem(name: "month", value: month)]
        )
    }

    func submitQuestionnaire(
        questionnaireId: String,
        accessToken: String,
        communityId: String?,
        deviceId: String,
        idempotencyKey: String,
        responses: [MobileQuestionnaireAnswerDTO]
    ) async throws -> MobileQuestionnaireSubmitResponseDTO {
        try await authenticatedPost(
            "questionnaires/\(questionnaireId)/response",
            accessToken: accessToken,
            communityId: communityId,
            deviceId: deviceId,
            idempotencyKey: idempotencyKey,
            body: QuestionnaireSubmitRequestBody(responses: responses)
        )
    }

    func formationOverview(
        accessToken: String,
        communityId: String?,
        deviceId: String
    ) async throws -> MobileFormationOverviewResponseDTO {
        try await get(
            "formation/overview",
            accessToken: accessToken,
            communityId: communityId,
            deviceId: deviceId
        )
    }

    func formationLesson(
        trackId: String,
        moduleId: String,
        lessonNumber: Int,
        accessToken: String,
        communityId: String?,
        deviceId: String
    ) async throws -> MobileFormationLessonDetailDTO {
        try await get(
            "formation/\(trackId)/\(moduleId)/\(lessonNumber)",
            accessToken: accessToken,
            communityId: communityId,
            deviceId: deviceId
        )
    }

    func completeFormationLesson(
        lessonId: String,
        accessToken: String,
        communityId: String?,
        deviceId: String,
        idempotencyKey: String
    ) async throws -> MobileFormationLessonCompleteResponseDTO {
        try await authenticatedPost(
            "formation/lessons/\(lessonId)/complete",
            accessToken: accessToken,
            communityId: communityId,
            deviceId: deviceId,
            idempotencyKey: idempotencyKey,
            body: EmptyRequestBody()
        )
    }

    static func userMessage(for error: Error) -> String {
        if let apiError = error as? MESCMobileAPIError {
            return apiError.localizedDescription
        }

        return "Não foi possível concluir a operação."
    }

    private func get<Response: Decodable>(
        _ path: String,
        accessToken: String,
        communityId: String?,
        deviceId: String,
        queryItems: [URLQueryItem] = []
    ) async throws -> Response {
        var request = try makeRequest(path: path, queryItems: queryItems)
        request.httpMethod = "GET"
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        request.setValue(deviceId, forHTTPHeaderField: "X-Device-Id")
        if let communityId {
            request.setValue(communityId, forHTTPHeaderField: "X-Community-Id")
        }
        return try await send(request)
    }

    private func post<Response: Decodable, Body: Encodable>(_ path: String, body: Body) async throws -> Response {
        var request = try makeRequest(path: path)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try encoder.encode(body)
        return try await send(request)
    }

    private func authenticatedPost<Response: Decodable, Body: Encodable>(
        _ path: String,
        accessToken: String,
        communityId: String?,
        deviceId: String,
        idempotencyKey: String,
        body: Body
    ) async throws -> Response {
        var request = try makeRequest(path: path)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        request.setValue(deviceId, forHTTPHeaderField: "X-Device-Id")
        request.setValue(idempotencyKey, forHTTPHeaderField: "Idempotency-Key")
        if let communityId {
            request.setValue(communityId, forHTTPHeaderField: "X-Community-Id")
        }
        request.httpBody = try encoder.encode(body)
        return try await send(request)
    }

    private func makeRequest(path: String, queryItems: [URLQueryItem] = []) throws -> URLRequest {
        let url = baseURL.appendingPathComponent(path)
        guard var components = URLComponents(url: url, resolvingAgainstBaseURL: false) else {
            throw MESCMobileAPIError.invalidBaseURL
        }

        if !queryItems.isEmpty {
            components.queryItems = queryItems
        }

        guard let finalURL = components.url else {
            throw MESCMobileAPIError.invalidBaseURL
        }

        var request = URLRequest(url: finalURL)
        request.timeoutInterval = 20
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.setValue("MESCNative-iOS", forHTTPHeaderField: "User-Agent")
        return request
    }

    private func send<Response: Decodable>(_ request: URLRequest) async throws -> Response {
        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            guard let http = response as? HTTPURLResponse else {
                throw MESCMobileAPIError.transport(URLError(.badServerResponse))
            }

            guard (200..<300).contains(http.statusCode) else {
                let message = (try? decoder.decode(MobileErrorBodyDTO.self, from: data).message)
                    ?? (try? decoder.decode(MobileErrorBodyDTO.self, from: data).error)
                    ?? "Erro \(http.statusCode) na API mobile."
                throw MESCMobileAPIError.server(status: http.statusCode, message: message)
            }

            do {
                return try decoder.decode(Response.self, from: data)
            } catch {
                throw MESCMobileAPIError.decoding(error)
            }
        } catch let error as MESCMobileAPIError {
            throw error
        } catch {
            throw MESCMobileAPIError.transport(error)
        }
    }
}

private struct LoginRequestBody: Encodable {
    let email: String
    let password: String
    let keepSignedIn: Bool
    let deviceId: String
    let platform: String
    let appVersion: String?
}

private struct RefreshRequestBody: Encodable {
    let refreshToken: String
    let deviceId: String
}

private struct QuestionnaireSubmitRequestBody: Encodable {
    let responses: [MobileQuestionnaireAnswerDTO]
}

private struct EmptyRequestBody: Encodable {}

final class MESCNativeSessionStore {
    private enum DefaultsKey {
        static let deviceId = "mesc.native.deviceId"
        static let activeCommunityId = "mesc.native.activeCommunityId"
    }

    private let defaults = UserDefaults.standard

    var deviceId: String {
        if let existing = defaults.string(forKey: DefaultsKey.deviceId), !existing.isEmpty {
            return existing
        }

        let created = UUID().uuidString.lowercased()
        defaults.set(created, forKey: DefaultsKey.deviceId)
        return created
    }

    var activeCommunityId: String? {
        get { defaults.string(forKey: DefaultsKey.activeCommunityId) }
        set {
            if let newValue {
                defaults.set(newValue, forKey: DefaultsKey.activeCommunityId)
            } else {
                defaults.removeObject(forKey: DefaultsKey.activeCommunityId)
            }
        }
    }

    var accessToken: String? {
        get { MESCKeychain.read(key: "accessToken") }
        set { MESCKeychain.write(newValue, key: "accessToken") }
    }

    var refreshToken: String? {
        get { MESCKeychain.read(key: "refreshToken") }
        set { MESCKeychain.write(newValue, key: "refreshToken") }
    }

    func clearTokens() {
        accessToken = nil
        refreshToken = nil
    }
}

enum MESCKeychain {
    private static let service = "app.saojudastadeu.mesc.native"

    static func read(key: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]

        var item: CFTypeRef?
        guard SecItemCopyMatching(query as CFDictionary, &item) == errSecSuccess,
              let data = item as? Data
        else {
            return nil
        }

        return String(data: data, encoding: .utf8)
    }

    static func write(_ value: String?, key: String) {
        delete(key: key)

        guard let value, let data = value.data(using: .utf8) else {
            return
        }

        let attributes: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        ]

        SecItemAdd(attributes as CFDictionary, nil)
    }

    static func delete(key: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key
        ]

        SecItemDelete(query as CFDictionary)
    }
}

struct ScheduleDay: Identifiable, Equatable {
    let id: Int
    let dayNumber: Int
    let date: Date
    let missions: [ScheduleMission]

    var formattedTitle: String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "pt_BR")
        formatter.dateFormat = "EEEE, dd 'de' MMMM"
        return formatter.string(from: date).capitalized
    }
}

struct ScheduleMission: Identifiable, Equatable {
    let id = UUID()
    let dayNumber: Int
    let time: String
    let title: String
    let community: String
    let role: String
    let ministers: [String]
}

enum ScheduleFixtures {
    static let monthDate = makeDate(day: 1)

    static let days: [ScheduleDay] = (1...31).map { day in
        ScheduleDay(
            id: day,
            dayNumber: day,
            date: makeDate(day: day),
            missions: missions(for: day)
        )
    }

    private static func makeDate(day: Int) -> Date {
        var components = DateComponents()
        components.year = 2026
        components.month = 7
        components.day = day
        return Calendar.current.date(from: components) ?? Date()
    }

    private static func missions(for day: Int) -> [ScheduleMission] {
        switch day {
        case 5:
            return [
                ScheduleMission(
                    dayNumber: day,
                    time: "08:00",
                    title: "Missa Dominical",
                    community: "Santuário",
                    role: "P1: Auxiliar 1",
                    ministers: ["Ana Maria", "Carlos Roberto", "Fatima Lima", "Jose Paulo"]
                ),
                ScheduleMission(
                    dayNumber: day,
                    time: "18:00",
                    title: "Missa da Noite",
                    community: "Santuário",
                    role: "Reserva",
                    ministers: ["Marina Costa", "Paulo Sergio", "Ana Maria"]
                )
            ]
        case 12:
            return [
                ScheduleMission(
                    dayNumber: day,
                    time: "10:00",
                    title: "Missa da Comunidade",
                    community: "São Judas",
                    role: "P2: Patena",
                    ministers: ["Ana Maria", "Lucia Helena", "Roberto Alves"]
                )
            ]
        case 19:
            return [
                ScheduleMission(
                    dayNumber: day,
                    time: "08:00",
                    title: "Missa Dominical",
                    community: "Santuário",
                    role: "P1: Auxiliar 2",
                    ministers: ["Ana Maria", "Beatriz Souza", "Miguel Rocha", "Clara Dias"]
                )
            ]
        case 26:
            return [
                ScheduleMission(
                    dayNumber: day,
                    time: "19:30",
                    title: "Missa Votiva",
                    community: "Santuário",
                    role: "P3: Apoio",
                    ministers: ["Ana Maria", "Ricardo Nunes", "Helena Prado"]
                )
            ]
        default:
            return []
        }
    }
}
