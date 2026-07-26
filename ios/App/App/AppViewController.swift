import Foundation
import LocalAuthentication
import Security
import SwiftUI
import UIKit
import UserNotifications

extension Notification.Name {
    static let mescRemoteNotificationDeviceToken = Notification.Name("MESCRemoteNotificationDeviceToken")
    static let mescRemoteNotificationRegistrationFailed = Notification.Name("MESCRemoteNotificationRegistrationFailed")
    static let mescRemoteNotificationOpened = Notification.Name("MESCRemoteNotificationOpened")
    static let mescRemoteNotificationDeepLinkStorageKey = "mesc.native.pendingPushDeepLink"
}

final class AppViewController: UIViewController {
    private var hostingController: UIHostingController<MESCNativeRootView>?

    override func viewDidLoad() {
        super.viewDidLoad()

        MESCNativeTabBarStyler.apply()

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

enum MESCNativeTabBarStyler {
    static func apply() {
        let selectedColor = UIColor { traits in
            traits.userInterfaceStyle == .dark ? UIColor(hex: 0xC5A059) : UIColor(hex: 0x722F37)
        }
        let normalColor = UIColor { traits in
            traits.userInterfaceStyle == .dark ? UIColor(hex: 0xA8A8A8) : UIColor(hex: 0x727272)
        }

        UITabBar.appearance().isTranslucent = true
        UITabBar.appearance().tintColor = selectedColor
        UITabBar.appearance().unselectedItemTintColor = normalColor

        guard #unavailable(iOS 26.0) else { return }

        let appearance = UITabBarAppearance()
        appearance.configureWithTransparentBackground()
        appearance.backgroundEffect = UIBlurEffect(style: .systemUltraThinMaterial)
        appearance.backgroundColor = UIColor { traits in
            traits.userInterfaceStyle == .dark
                ? UIColor(hex: 0x1C1C1E, alpha: 0.54)
                : UIColor(hex: 0xFFFFFF, alpha: 0.38)
        }
        appearance.shadowColor = UIColor { traits in
            traits.userInterfaceStyle == .dark
                ? UIColor(hex: 0xC5A059, alpha: 0.16)
                : UIColor(hex: 0xC5A059, alpha: 0.22)
        }

        configure(appearance.stackedLayoutAppearance, selectedColor: selectedColor, normalColor: normalColor)
        configure(appearance.inlineLayoutAppearance, selectedColor: selectedColor, normalColor: normalColor)
        configure(appearance.compactInlineLayoutAppearance, selectedColor: selectedColor, normalColor: normalColor)

        UITabBar.appearance().standardAppearance = appearance
        UITabBar.appearance().scrollEdgeAppearance = appearance
    }

    private static func configure(_ itemAppearance: UITabBarItemAppearance, selectedColor: UIColor, normalColor: UIColor) {
        itemAppearance.normal.iconColor = normalColor
        itemAppearance.normal.titleTextAttributes = [
            .foregroundColor: normalColor,
            .font: UIFont.systemFont(ofSize: 11, weight: .medium)
        ]
        itemAppearance.selected.iconColor = selectedColor
        itemAppearance.selected.titleTextAttributes = [
            .foregroundColor: selectedColor,
            .font: UIFont.systemFont(ofSize: 11, weight: .semibold)
        ]
    }
}

@MainActor
final class MESCNativeAppModel: ObservableObject {
    enum SessionState: Equatable {
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
    @Published var profile: MobileProfileDTO?
    @Published var profileImage: UIImage?
    @Published var activeCommunity: MobileCommunityDTO?
    @Published var missionHome: MobileMissionHomeDTO?
    @Published var scheduleMonth: MobileScheduleMonthDTO?
    @Published var questionnaireCurrent: MobileQuestionnaireCurrentDTO?
    @Published var formationOverview: MobileFormationOverviewDTO?
    @Published var formationLessonDetail: MobileFormationLessonDetailDTO?
    @Published var formationAdminStudio: MobileFormationAdminStudioDTO?
    @Published var isSavingQuestionnaire = false
    @Published var isLoadingFormationLesson = false
    @Published var isCompletingFormationLesson = false
    @Published var completingFormationSectionId: String?
    @Published var isLoadingFormationStudio = false
    @Published var isSavingFormationContent = false
    @Published var questionnaireMessage: String?
    @Published var formationMessage: String?
    @Published var scheduleActionMessage: String?
    @Published var isMutatingSchedule = false
    @Published var substitutions: [MobileSubstitutionDTO] = []
    @Published var isLoadingSubstitutions = false
    @Published var substitutionMessage: String?
    @Published var isSubstitutionCenterPresentationRequested = false
    @Published var isSavingProfile = false
    @Published var isUpdatingProfilePhoto = false
    @Published var profileMessage: String?
    @Published var isUsingFallbackData = false
    @Published var pushAuthorizationStatus: UNAuthorizationStatus = .notDetermined
    @Published var pushPermissionMessage: String?
    @Published var currentDevice: MobileDeviceDTO?
    @Published var notificationPreferences = MESCNotificationPreference.defaults
    @Published var notifications: [MobileNotificationDTO] = []
    @Published var unreadNotificationsCount = 0
    @Published var isLoadingNotifications = false
    @Published var isMarkingAllNotificationsRead = false
    @Published var markingNotificationId: String?
    @Published var notificationMessage: String?
    @Published var isNotificationCenterPresented = false
    @Published var pendingNotificationDeepLink: String?
    @Published var isQuestionnairePresentationRequested = false
    @Published var biometricAvailable = false
    @Published var biometricEnabled = false
    @Published var biometricTypeLabel = "Face ID ou Touch ID"
    @Published var settingsMessage: String?
    @Published var isUpdatingSettings = false

    private let client = MESCMobileAPIClient()
    private let sessionStore = MESCNativeSessionStore()
    private var notificationObservers: [NSObjectProtocol] = []

    init() {
        notificationObservers.append(
            NotificationCenter.default.addObserver(
                forName: .mescRemoteNotificationDeviceToken,
                object: nil,
                queue: .main
            ) { [weak self] notification in
                guard let token = notification.object as? String, !token.isEmpty else { return }
                Task { @MainActor [weak self] in
                    await self?.handleRemoteNotificationToken(token)
                }
            }
        )
        notificationObservers.append(
            NotificationCenter.default.addObserver(
                forName: .mescRemoteNotificationOpened,
                object: nil,
                queue: .main
            ) { [weak self] notification in
                guard let deepLink = notification.object as? String, deepLink.hasPrefix("/") else { return }
                Task { @MainActor [weak self] in
                    self?.pendingNotificationDeepLink = deepLink
                }
            }
        )

        if let deepLink = UserDefaults.standard.string(forKey: Notification.Name.mescRemoteNotificationDeepLinkStorageKey), deepLink.hasPrefix("/") {
            pendingNotificationDeepLink = deepLink
        }
        notificationObservers.append(
            NotificationCenter.default.addObserver(
                forName: .mescRemoteNotificationRegistrationFailed,
                object: nil,
                queue: .main
            ) { [weak self] notification in
                let message = (notification.object as? String) ?? "Falha ao registrar notificações remotas."
                Task { @MainActor [weak self] in
                    await self?.handleRemoteNotificationRegistrationFailure(message)
                }
            }
        )
    }

    deinit {
        notificationObservers.forEach(NotificationCenter.default.removeObserver)
    }

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

    var pushAuthorizationGranted: Bool {
        switch pushAuthorizationStatus {
        case .authorized, .provisional, .ephemeral:
            return true
        default:
            return false
        }
    }

    var pushEnabled: Bool {
        pushAuthorizationGranted
    }

    var pushLinkedToServer: Bool {
        pushAuthorizationGranted
            && currentDevice?.pushEnabled == true
            && currentDevice?.pushProvider == "apns"
    }

    var pushStatusText: String {
        switch pushAuthorizationStatus {
        case .authorized:
            if pushLinkedToServer {
                return "Ativas e vinculadas"
            }
            if sessionStore.remotePushToken != nil {
                return "Sincronizando com o MESC"
            }
            return "Permissão ativa no iPhone"
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

    var pushConnectionText: String {
        let iosState = pushAuthorizationGranted ? "iOS ativo" : "iOS pendente"
        let serverState = pushLinkedToServer ? "MESC vinculado" : "MESC pendente"
        return "\(iosState) • \(serverState)"
    }

    var pushActionTitle: String {
        switch pushAuthorizationStatus {
        case .denied:
            return "Abrir Ajustes"
        case .notDetermined:
            return "Permitir"
        default:
            return pushLinkedToServer ? "Revalidar" : "Vincular"
        }
    }

    var pushPermissionDetail: String {
        switch pushAuthorizationStatus {
        case .denied:
            return "O iOS bloqueou as notificações. Abra os Ajustes do iPhone para permitir novamente."
        case .notDetermined:
            return "Receba escala, questionário, substituições e avisos sem depender do navegador."
        default:
            return "Permissão nativa do iPhone com entrega pelo cadastro seguro deste aparelho."
        }
    }

    var canManageFormation: Bool {
        let role = user?.role.lowercased() ?? ""
        return role == "gestor" || role == "reitor" || role == "coordenador" || role.hasPrefix("coordenador_")
    }

    var formationVideoLessons: [MobileFormationLessonDTO] {
        formationOverview?.tracks.flatMap { track in
            track.modules.flatMap { module in
                module.lessons.filter { lesson in
                    guard let videoUrl = lesson.videoUrl else { return false }
                    return !videoUrl.isEmpty
                }
            }
        } ?? []
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
        profile = nil
        profileImage = nil
        activeCommunity = nil
        missionHome = nil
        scheduleMonth = nil
        questionnaireCurrent = nil
        formationOverview = nil
        formationLessonDetail = nil
        formationAdminStudio = nil
        questionnaireMessage = nil
        formationMessage = nil
        scheduleActionMessage = nil
        settingsMessage = nil
        currentDevice = nil
        notifications = []
        unreadNotificationsCount = 0
        notificationMessage = nil
        isNotificationCenterPresented = false
        substitutions = []
        substitutionMessage = nil
        isSubstitutionCenterPresentationRequested = false
        profileMessage = nil
        isQuestionnairePresentationRequested = false
        pendingNotificationDeepLink = nil
        UserDefaults.standard.removeObject(forKey: Notification.Name.mescRemoteNotificationDeepLinkStorageKey)
        errorMessage = nil
        isUsingFallbackData = false
        selectedMonth = Self.currentMonthString()
        sessionState = .unauthenticated
    }

    func refreshDevicePermissions() async {
        let settings = await UNUserNotificationCenter.current().notificationSettings()
        pushAuthorizationStatus = settings.authorizationStatus
        refreshBiometricCapability()
    }

    func refreshNativeNotificationState() async {
        await refreshDevicePermissions()

        guard sessionState == .authenticated else { return }

        if pushAuthorizationGranted {
            await MainActor.run {
                UIApplication.shared.registerForRemoteNotifications()
            }
            await syncStoredRemotePushTokenIfNeeded()
        } else if currentDevice?.pushEnabled == true {
            await updateCurrentDevice(pushEnabled: false)
        }
    }

    func requestPushNotifications() async {
        pushPermissionMessage = nil
        await refreshDevicePermissions()

        if pushAuthorizationStatus == .denied {
            pushPermissionMessage = "Ative as notificações em Ajustes do iPhone para receber avisos do MESC."
            openSystemSettings()
            return
        }

        if pushAuthorizationGranted {
            await MainActor.run {
                UIApplication.shared.registerForRemoteNotifications()
            }
            if let token = sessionStore.remotePushToken {
                await updateCurrentDevice(
                    pushToken: token,
                    pushProvider: "apns",
                    pushEnabled: true
                )
                pushPermissionMessage = "Notificações nativas vinculadas a este iPhone."
            } else {
                pushPermissionMessage = "Permissão ativa. Finalizando o vínculo seguro deste iPhone."
            }
            return
        }

        do {
            let granted = try await UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound])
            await refreshDevicePermissions()
            if granted {
                await MainActor.run {
                    UIApplication.shared.registerForRemoteNotifications()
                }
                if let token = sessionStore.remotePushToken {
                    await updateCurrentDevice(
                        pushToken: token,
                        pushProvider: "apns",
                        pushEnabled: true
                    )
                    pushPermissionMessage = "Notificações nativas vinculadas a este iPhone."
                } else {
                    pushPermissionMessage = "Permissão concedida. Finalizando o vínculo seguro deste iPhone."
                }
            } else {
                pushPermissionMessage = "Permissão não concedida. Você pode habilitar em Ajustes do iPhone."
                await updateCurrentDevice(pushEnabled: false)
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
                    id: schedule.id,
                    scheduleId: schedule.id,
                    dayNumber: day,
                    time: Self.timeLabel(schedule.time),
                    title: Self.scheduleTitle(type: schedule.type),
                    community: schedule.location ?? activeCommunity?.name ?? scheduleMonth.community.name,
                    role: Self.positionLabel(schedule.position),
                    ministers: [user?.name ?? firstName],
                    confirmationStatus: schedule.confirmationStatus,
                    canConfirm: schedule.canConfirm ?? false,
                    canRequestSubstitution: schedule.canRequestSubstitution ?? false,
                    isCurrentUser: true
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

    func loadNotifications() async {
        guard let accessToken = sessionStore.accessToken else {
            return
        }

        isLoadingNotifications = true
        notificationMessage = nil

        do {
            try await loadNotifications(accessToken: accessToken)
        } catch {
            if Self.isAuthenticationFailure(error), await refreshSession(), let refreshedAccessToken = sessionStore.accessToken {
                do {
                    try await loadNotifications(accessToken: refreshedAccessToken)
                } catch {
                    notificationMessage = MESCMobileAPIClient.userMessage(for: error)
                }
            } else if Self.isAuthenticationFailure(error) {
                handleSessionFailure(error)
            } else {
                notificationMessage = MESCMobileAPIClient.userMessage(for: error)
            }
        }

        isLoadingNotifications = false
    }

    @discardableResult
    func markNotificationRead(_ notification: MobileNotificationDTO) async -> Bool {
        guard !notification.read else { return true }
        guard let accessToken = sessionStore.accessToken else {
            handleSessionFailure(MESCMobileAPIError.unauthenticated)
            return false
        }

        markingNotificationId = notification.id
        notificationMessage = nil

        do {
            let response = try await client.markNotificationRead(
                notificationId: notification.id,
                accessToken: accessToken,
                communityId: sessionStore.activeCommunityId,
                deviceId: sessionStore.deviceId
            )
            applyNotificationRead(response.notification)
            markingNotificationId = nil
            return true
        } catch {
            if Self.isAuthenticationFailure(error), await refreshSession(), let refreshedAccessToken = sessionStore.accessToken {
                do {
                    let response = try await client.markNotificationRead(
                        notificationId: notification.id,
                        accessToken: refreshedAccessToken,
                        communityId: sessionStore.activeCommunityId,
                        deviceId: sessionStore.deviceId
                    )
                    applyNotificationRead(response.notification)
                    markingNotificationId = nil
                    return true
                } catch {
                    notificationMessage = MESCMobileAPIClient.userMessage(for: error)
                }
            } else if Self.isAuthenticationFailure(error) {
                handleSessionFailure(error)
            } else {
                notificationMessage = MESCMobileAPIClient.userMessage(for: error)
            }
        }

        markingNotificationId = nil
        return false
    }

    @discardableResult
    func markAllNotificationsRead() async -> Bool {
        guard unreadNotificationsCount > 0 else { return true }
        guard let accessToken = sessionStore.accessToken else {
            handleSessionFailure(MESCMobileAPIError.unauthenticated)
            return false
        }

        isMarkingAllNotificationsRead = true
        notificationMessage = nil

        do {
            _ = try await client.markAllNotificationsRead(
                accessToken: accessToken,
                communityId: sessionStore.activeCommunityId,
                deviceId: sessionStore.deviceId
            )
            applyAllNotificationsRead()
            isMarkingAllNotificationsRead = false
            return true
        } catch {
            if Self.isAuthenticationFailure(error), await refreshSession(), let refreshedAccessToken = sessionStore.accessToken {
                do {
                    _ = try await client.markAllNotificationsRead(
                        accessToken: refreshedAccessToken,
                        communityId: sessionStore.activeCommunityId,
                        deviceId: sessionStore.deviceId
                    )
                    applyAllNotificationsRead()
                    isMarkingAllNotificationsRead = false
                    return true
                } catch {
                    notificationMessage = MESCMobileAPIClient.userMessage(for: error)
                }
            } else if Self.isAuthenticationFailure(error) {
                handleSessionFailure(error)
            } else {
                notificationMessage = MESCMobileAPIClient.userMessage(for: error)
            }
        }

        isMarkingAllNotificationsRead = false
        return false
    }

    func confirmSchedule(scheduleId: String) async -> Bool {
        await mutateSchedule(messageOnSuccess: "Presença confirmada com sucesso.") { accessToken in
            _ = try await self.client.confirmSchedule(
                scheduleId: scheduleId,
                accessToken: accessToken,
                communityId: self.sessionStore.activeCommunityId,
                deviceId: self.sessionStore.deviceId,
                idempotencyKey: UUID().uuidString,
                status: "confirmed",
                notes: nil
            )
        }
    }

    func requestSubstitution(scheduleId: String, reason: String?) async -> Bool {
        let requested = await mutateSchedule(messageOnSuccess: "Pedido de substituição publicado.") { accessToken in
            _ = try await self.client.requestSubstitution(
                scheduleId: scheduleId,
                accessToken: accessToken,
                communityId: self.sessionStore.activeCommunityId,
                deviceId: self.sessionStore.deviceId,
                idempotencyKey: UUID().uuidString,
                reason: reason
            )
        }

        if requested {
            await loadSubstitutions()
        }

        return requested
    }

    func loadSubstitutions() async {
        guard let accessToken = sessionStore.accessToken else { return }

        isLoadingSubstitutions = true
        substitutionMessage = nil

        do {
            try await loadSubstitutions(accessToken: accessToken)
        } catch {
            if Self.isAuthenticationFailure(error), await refreshSession(), let refreshedAccessToken = sessionStore.accessToken {
                do {
                    try await loadSubstitutions(accessToken: refreshedAccessToken)
                } catch {
                    substitutionMessage = MESCMobileAPIClient.userMessage(for: error)
                }
            } else if Self.isAuthenticationFailure(error) {
                handleSessionFailure(error)
            } else {
                substitutionMessage = MESCMobileAPIClient.userMessage(for: error)
            }
        }

        isLoadingSubstitutions = false
    }

    func claimSubstitution(id: String, message: String?) async -> Bool {
        let claimed = await mutateSchedule(messageOnSuccess: "Substituição confirmada. A escala foi atualizada.") { accessToken in
            _ = try await self.client.claimSubstitution(
                substitutionId: id,
                accessToken: accessToken,
                communityId: self.sessionStore.activeCommunityId,
                deviceId: self.sessionStore.deviceId,
                idempotencyKey: UUID().uuidString,
                message: message
            )
        }

        if claimed {
            await loadSubstitutions()
        }

        return claimed
    }

    @discardableResult
    func saveProfile(
        name: String,
        phone: String,
        whatsapp: String,
        scheduleDisplayName: String,
        ministryStartDate: Date?,
        maritalStatus: String
    ) async -> Bool {
        let trimmedName = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard trimmedName.count >= 3 else {
            profileMessage = "Informe seu nome completo para atualizar o cadastro."
            return false
        }

        return await mutateProfile(messageOnSuccess: "Dados do perfil atualizados.") { accessToken, idempotencyKey in
            _ = try await self.client.updateProfile(
                accessToken: accessToken,
                communityId: self.sessionStore.activeCommunityId,
                deviceId: self.sessionStore.deviceId,
                idempotencyKey: idempotencyKey,
                body: ProfileUpdateRequestBody(
                    name: trimmedName,
                    phone: Self.optionalText(phone),
                    whatsapp: Self.optionalText(whatsapp),
                    scheduleDisplayName: Self.optionalText(scheduleDisplayName),
                    ministryStartDate: ministryStartDate.map(Self.profileDateString),
                    maritalStatus: Self.optionalText(maritalStatus)
                )
            )
        }
    }

    @discardableResult
    func uploadProfilePhoto(_ image: UIImage) async -> Bool {
        guard let imageData = MESCProfileImageEncoder.jpegData(from: image) else {
            profileMessage = "Não foi possível preparar esta foto. Tente outra imagem."
            return false
        }

        isUpdatingProfilePhoto = true
        let uploaded = await mutateProfile(messageOnSuccess: "Foto de perfil atualizada.") { accessToken, idempotencyKey in
            _ = try await self.client.uploadProfilePhoto(
                accessToken: accessToken,
                communityId: self.sessionStore.activeCommunityId,
                deviceId: self.sessionStore.deviceId,
                idempotencyKey: idempotencyKey,
                imageBase64: imageData.base64EncodedString(),
                contentType: "image/jpeg"
            )
        }
        isUpdatingProfilePhoto = false
        return uploaded
    }

    @discardableResult
    func removeProfilePhoto() async -> Bool {
        isUpdatingProfilePhoto = true
        let removed = await mutateProfile(messageOnSuccess: "Foto de perfil removida.") { accessToken, idempotencyKey in
            _ = try await self.client.removeProfilePhoto(
                accessToken: accessToken,
                communityId: self.sessionStore.activeCommunityId,
                deviceId: self.sessionStore.deviceId,
                idempotencyKey: idempotencyKey
            )
        }
        isUpdatingProfilePhoto = false
        return removed
    }

    func createOfficialScheduleExport() throws -> URL {
        guard let scheduleMonth else {
            throw MESCMobileAPIError.server(status: 400, message: "Escala do mês ainda não carregada.")
        }

        let html = Self.officialScheduleHTML(
            monthLabel: currentMonthLabel,
            communityName: scheduleMonth.community.name,
            assignments: scheduleMonth.publicSchedule.assignments
        )
        let fileName = "Escala-\(scheduleMonth.month)-MESC.html"
        let url = FileManager.default.temporaryDirectory.appendingPathComponent(fileName)
        try html.write(to: url, atomically: true, encoding: .utf8)
        return url
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

    func setBiometricPreference(_ enabled: Bool) async {
        settingsMessage = nil
        refreshBiometricCapability()

        guard biometricAvailable || !enabled else {
            biometricEnabled = false
            settingsMessage = "Este aparelho não possui biometria disponível."
            return
        }

        let previous = biometricEnabled
        biometricEnabled = enabled
        let success = await updateCurrentDevice(biometricCapable: biometricAvailable, biometricEnabled: enabled)
        if success {
            settingsMessage = enabled ? "\(biometricTypeLabel) registrado neste aparelho." : "Biometria desativada neste aparelho."
        } else {
            biometricEnabled = previous
        }
    }

    func setNotificationPreference(key: String, enabled: Bool) async {
        guard MESCNotificationPreference.options.contains(where: { $0.key == key }) else { return }

        settingsMessage = nil
        var next = notificationPreferences
        let previous = notificationPreferences
        next[key] = enabled
        notificationPreferences = next

        let success = await updateCurrentDevice(notificationPreferences: next)
        if success {
            settingsMessage = "Preferências atualizadas."
        } else {
            notificationPreferences = previous
        }
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

    func completeFormationLessonSection(sectionId: String) async -> Bool {
        guard let detail = formationLessonDetail else {
            formationMessage = "Abra uma aula antes de concluir."
            return false
        }

        guard detail.progress.completedSections?.contains(sectionId) != true else {
            formationMessage = "Seção já concluída."
            return true
        }

        guard let accessToken = sessionStore.accessToken else {
            handleSessionFailure(MESCMobileAPIError.unauthenticated)
            return false
        }

        completingFormationSectionId = sectionId
        formationMessage = nil

        do {
            let response = try await client.completeFormationLessonSection(
                lessonId: detail.lesson.id,
                sectionId: sectionId,
                accessToken: accessToken,
                communityId: sessionStore.activeCommunityId,
                deviceId: sessionStore.deviceId,
                idempotencyKey: UUID().uuidString
            )
            formationLessonDetail = detail.withProgress(response.progress)
            try await loadFormationOverview(accessToken: accessToken)
            formationMessage = response.progress.status == "completed" ? "Aula concluída com sucesso." : "Seção concluída."
            completingFormationSectionId = nil
            return true
        } catch {
            if Self.isAuthenticationFailure(error), await refreshSession(), let accessToken = sessionStore.accessToken {
                do {
                    let response = try await client.completeFormationLessonSection(
                        lessonId: detail.lesson.id,
                        sectionId: sectionId,
                        accessToken: accessToken,
                        communityId: sessionStore.activeCommunityId,
                        deviceId: sessionStore.deviceId,
                        idempotencyKey: UUID().uuidString
                    )
                    formationLessonDetail = detail.withProgress(response.progress)
                    try await loadFormationOverview(accessToken: accessToken)
                    formationMessage = response.progress.status == "completed" ? "Aula concluída com sucesso." : "Seção concluída."
                    completingFormationSectionId = nil
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

        completingFormationSectionId = nil
        return false
    }

    func loadFormationAdminStudio() async {
        guard canManageFormation else {
            formationMessage = "Apenas gestores e coordenadores podem editar formação."
            return
        }

        guard let accessToken = sessionStore.accessToken else {
            handleSessionFailure(MESCMobileAPIError.unauthenticated)
            return
        }

        isLoadingFormationStudio = true
        formationMessage = nil

        do {
            let response = try await client.formationAdminStudio(
                accessToken: accessToken,
                communityId: sessionStore.activeCommunityId,
                deviceId: sessionStore.deviceId
            )
            formationAdminStudio = response.studio
            isLoadingFormationStudio = false
        } catch {
            if Self.isAuthenticationFailure(error), await refreshSession(), let accessToken = sessionStore.accessToken {
                do {
                    let response = try await client.formationAdminStudio(
                        accessToken: accessToken,
                        communityId: sessionStore.activeCommunityId,
                        deviceId: sessionStore.deviceId
                    )
                    formationAdminStudio = response.studio
                } catch {
                    formationMessage = MESCMobileAPIClient.userMessage(for: error)
                }
            } else if Self.isAuthenticationFailure(error) {
                handleSessionFailure(error)
            } else {
                formationMessage = MESCMobileAPIClient.userMessage(for: error)
            }

            isLoadingFormationStudio = false
        }
    }

    func createFormationAdminLesson(_ payload: FormationAdminLessonRequestBody) async -> Bool {
        guard canManageFormation else {
            formationMessage = "Apenas gestores e coordenadores podem editar formação."
            return false
        }

        guard let accessToken = sessionStore.accessToken else {
            handleSessionFailure(MESCMobileAPIError.unauthenticated)
            return false
        }

        isSavingFormationContent = true
        formationMessage = nil

        do {
            _ = try await client.createFormationAdminLesson(
                payload: payload,
                accessToken: accessToken,
                communityId: sessionStore.activeCommunityId,
                deviceId: sessionStore.deviceId,
                idempotencyKey: UUID().uuidString
            )
            try await loadFormationOverview(accessToken: accessToken)
            await loadFormationAdminStudio()
            formationMessage = payload.isActive == false ? "Aula salva como rascunho." : "Aula publicada com sucesso."
            isSavingFormationContent = false
            return true
        } catch {
            if Self.isAuthenticationFailure(error), await refreshSession(), let accessToken = sessionStore.accessToken {
                do {
                    _ = try await client.createFormationAdminLesson(
                        payload: payload,
                        accessToken: accessToken,
                        communityId: sessionStore.activeCommunityId,
                        deviceId: sessionStore.deviceId,
                        idempotencyKey: UUID().uuidString
                    )
                    try await loadFormationOverview(accessToken: accessToken)
                    await loadFormationAdminStudio()
                    formationMessage = payload.isActive == false ? "Aula salva como rascunho." : "Aula publicada com sucesso."
                    isSavingFormationContent = false
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

        isSavingFormationContent = false
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
            try await loadProfile(accessToken: accessToken)
        } catch {
            if Self.isAuthenticationFailure(error) {
                throw error
            }
        }

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

        do {
            try await loadCurrentDevice(accessToken: accessToken)
            await syncStoredRemotePushTokenIfNeeded()
        } catch {
            if Self.isAuthenticationFailure(error) {
                throw error
            }
        }

        do {
            try await loadNotifications(accessToken: accessToken)
        } catch {
            if Self.isAuthenticationFailure(error) {
                throw error
            }
        }
    }

    private func loadNotifications(accessToken: String) async throws {
        let response = try await client.notifications(
            accessToken: accessToken,
            communityId: sessionStore.activeCommunityId,
            deviceId: sessionStore.deviceId,
            limit: 60
        )
        notifications = response.notifications
        unreadNotificationsCount = response.unreadCount
    }

    private func loadProfile(accessToken: String) async throws {
        let response = try await client.profile(
            accessToken: accessToken,
            communityId: sessionStore.activeCommunityId,
            deviceId: sessionStore.deviceId
        )
        applyProfile(response.profile)

        guard response.profile.photoUrl != nil else {
            profileImage = nil
            return
        }

        do {
            let data = try await client.profilePhoto(
                accessToken: accessToken,
                communityId: sessionStore.activeCommunityId,
                deviceId: sessionStore.deviceId
            )
            profileImage = UIImage(data: data)
        } catch {
            if Self.isAuthenticationFailure(error) {
                throw error
            }
            profileImage = nil
        }
    }

    private func applyProfile(_ updatedProfile: MobileProfileDTO) {
        profile = updatedProfile
        user = MobileUserDTO(
            id: updatedProfile.id,
            email: updatedProfile.email,
            name: updatedProfile.name,
            role: updatedProfile.role,
            homeCommunityId: updatedProfile.homeCommunityId,
            requiresPasswordChange: updatedProfile.requiresPasswordChange,
            photoUrl: updatedProfile.photoUrl
        )
    }

    private func loadSubstitutions(accessToken: String) async throws {
        let response = try await client.substitutions(
            accessToken: accessToken,
            communityId: sessionStore.activeCommunityId,
            deviceId: sessionStore.deviceId
        )
        substitutions = response.substitutions
    }

    private func applyNotificationRead(_ update: MobileNotificationReadDTO) {
        guard let current = notifications.first(where: { $0.id == update.id }) else { return }

        notifications = notifications.map { notification in
            notification.id == update.id
                ? notification.withRead(read: update.read, readAt: update.readAt)
                : notification
        }

        if !current.read && update.read {
            unreadNotificationsCount = max(0, unreadNotificationsCount - 1)
        }
    }

    private func applyAllNotificationsRead() {
        let readAt = ISO8601DateFormatter().string(from: Date())
        notifications = notifications.map { $0.withRead(read: true, readAt: $0.readAt ?? readAt) }
        unreadNotificationsCount = 0
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

    private func loadCurrentDevice(accessToken: String) async throws {
        let response = try await client.currentDevice(
            accessToken: accessToken,
            communityId: sessionStore.activeCommunityId,
            deviceId: sessionStore.deviceId
        )
        applyDevice(response.device)
    }

    private func handleRemoteNotificationToken(_ token: String) async {
        sessionStore.remotePushToken = token
        pushPermissionMessage = "Notificações nativas vinculadas a este iPhone."

        guard sessionState == .authenticated else { return }
        await updateCurrentDevice(
            pushToken: token,
            pushProvider: "apns",
            pushEnabled: true
        )
    }

    private func handleRemoteNotificationRegistrationFailure(_ message: String) async {
        pushPermissionMessage = "O iOS não concluiu o registro de notificações: \(message)"

        guard sessionState == .authenticated else { return }
        await updateCurrentDevice(pushEnabled: false)
    }

    private func syncStoredRemotePushTokenIfNeeded() async {
        guard pushEnabled, let token = sessionStore.remotePushToken else { return }
        guard currentDevice?.pushProvider != "apns" || currentDevice?.pushEnabled != true else { return }

        await updateCurrentDevice(
            pushToken: token,
            pushProvider: "apns",
            pushEnabled: true
        )
    }

    private func refreshSession() async -> Bool {
        guard let refreshToken = sessionStore.refreshToken else { return false }

        do {
            let response = try await client.refresh(refreshToken: refreshToken, deviceId: sessionStore.deviceId)
            persist(authResponse: response)
            user = response.user
            activeCommunity = response.communities.first(where: { $0.id == response.activeCommunityId }) ?? response.communities.first
            applyDevice(response.device)
            return true
        } catch {
            return false
        }
    }

    private func persist(authResponse response: MobileAuthResponseDTO) {
        sessionStore.accessToken = response.auth.accessToken
        sessionStore.refreshToken = response.auth.refreshToken
        sessionStore.activeCommunityId = response.activeCommunityId
        applyDevice(response.device)
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

    private func mutateSchedule(
        messageOnSuccess: String,
        operation: @escaping (String) async throws -> Void
    ) async -> Bool {
        guard let accessToken = sessionStore.accessToken else {
            handleSessionFailure(MESCMobileAPIError.unauthenticated)
            return false
        }

        isMutatingSchedule = true
        scheduleActionMessage = nil

        do {
            try await operation(accessToken)
            try await loadHomeAndSchedules()
            scheduleActionMessage = messageOnSuccess
            isMutatingSchedule = false
            return true
        } catch {
            if Self.isAuthenticationFailure(error), await refreshSession(), let accessToken = sessionStore.accessToken {
                do {
                    try await operation(accessToken)
                    try await loadHomeAndSchedules()
                    scheduleActionMessage = messageOnSuccess
                    isMutatingSchedule = false
                    return true
                } catch {
                    scheduleActionMessage = MESCMobileAPIClient.userMessage(for: error)
                }
            } else if Self.isAuthenticationFailure(error) {
                handleSessionFailure(error)
            } else {
                scheduleActionMessage = MESCMobileAPIClient.userMessage(for: error)
            }
        }

        isMutatingSchedule = false
        return false
    }

    private func mutateProfile(
        messageOnSuccess: String,
        operation: @escaping (String, String) async throws -> Void
    ) async -> Bool {
        guard let accessToken = sessionStore.accessToken else {
            handleSessionFailure(MESCMobileAPIError.unauthenticated)
            return false
        }

        let idempotencyKey = UUID().uuidString
        isSavingProfile = true
        profileMessage = nil

        do {
            try await operation(accessToken, idempotencyKey)
            try await loadProfile(accessToken: accessToken)
            profileMessage = messageOnSuccess
            isSavingProfile = false
            return true
        } catch {
            if Self.isAuthenticationFailure(error), await refreshSession(), let refreshedAccessToken = sessionStore.accessToken {
                do {
                    try await operation(refreshedAccessToken, idempotencyKey)
                    try await loadProfile(accessToken: refreshedAccessToken)
                    profileMessage = messageOnSuccess
                    isSavingProfile = false
                    return true
                } catch {
                    profileMessage = MESCMobileAPIClient.userMessage(for: error)
                }
            } else if Self.isAuthenticationFailure(error) {
                handleSessionFailure(error)
            } else {
                profileMessage = MESCMobileAPIClient.userMessage(for: error)
            }
        }

        isSavingProfile = false
        return false
    }

    @discardableResult
    private func updateCurrentDevice(
        pushToken: String? = nil,
        pushProvider: String? = nil,
        pushEnabled: Bool? = nil,
        biometricCapable: Bool? = nil,
        biometricEnabled: Bool? = nil,
        notificationPreferences: [String: Bool]? = nil
    ) async -> Bool {
        guard let accessToken = sessionStore.accessToken else { return false }

        isUpdatingSettings = true
        settingsMessage = nil

        do {
            let response = try await client.updateCurrentDevice(
                accessToken: accessToken,
                communityId: sessionStore.activeCommunityId,
                deviceId: sessionStore.deviceId,
                appVersion: Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String,
                pushToken: pushToken,
                pushProvider: pushProvider,
                pushEnabled: pushEnabled,
                biometricCapable: biometricCapable,
                biometricEnabled: biometricEnabled,
                notificationPreferences: notificationPreferences
            )
            applyDevice(response.device)
            isUpdatingSettings = false
            return true
        } catch {
            if Self.isAuthenticationFailure(error), await refreshSession(), let accessToken = sessionStore.accessToken {
                do {
                    let response = try await client.updateCurrentDevice(
                        accessToken: accessToken,
                        communityId: sessionStore.activeCommunityId,
                        deviceId: sessionStore.deviceId,
                        appVersion: Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String,
                        pushToken: pushToken,
                        pushProvider: pushProvider,
                        pushEnabled: pushEnabled,
                        biometricCapable: biometricCapable,
                        biometricEnabled: biometricEnabled,
                        notificationPreferences: notificationPreferences
                    )
                    applyDevice(response.device)
                    isUpdatingSettings = false
                    return true
                } catch {
                    settingsMessage = MESCMobileAPIClient.userMessage(for: error)
                }
            } else if Self.isAuthenticationFailure(error) {
                handleSessionFailure(error)
            } else {
                settingsMessage = MESCMobileAPIClient.userMessage(for: error)
            }
        }

        isUpdatingSettings = false
        return false
    }

    private func applyDevice(_ device: MobileDeviceDTO?) {
        guard let device else { return }

        currentDevice = device
        if let enabled = device.biometricEnabled {
            biometricEnabled = enabled
        }

        if let preferences = device.notificationPreferences {
            var merged = MESCNotificationPreference.defaults
            for (key, value) in preferences {
                if case let .bool(enabled) = value {
                    merged[key] = enabled
                }
            }
            notificationPreferences = merged
        }
    }

    private func refreshBiometricCapability() {
        let context = LAContext()
        var error: NSError?
        biometricAvailable = context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error)

        switch context.biometryType {
        case .faceID:
            biometricTypeLabel = "Face ID"
        case .touchID:
            biometricTypeLabel = "Touch ID"
        default:
            biometricTypeLabel = "Face ID ou Touch ID"
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
                id: "\(first.date)-\(first.time)-\(first.location ?? "")",
                scheduleId: nil,
                dayNumber: day,
                time: Self.timeLabel(first.time),
                title: Self.scheduleTitle(type: first.type),
                community: first.location ?? activeCommunity?.name ?? "Comunidade",
                role: group.first(where: { $0.isCurrentUser }).map { Self.positionLabel($0.position) } ?? "\(group.count) ministros",
                ministers: ministers,
                confirmationStatus: nil,
                canConfirm: false,
                canRequestSubstitution: false,
                isCurrentUser: group.contains { $0.isCurrentUser }
            )
        }
    }

    private static func officialScheduleHTML(
        monthLabel: String,
        communityName: String,
        assignments: [MobilePublicScheduleAssignmentDTO]
    ) -> String {
        let grouped = Dictionary(grouping: assignments) { assignment in
            "\(assignment.date)|\(timeLabel(assignment.time))|\(scheduleTitle(type: assignment.type))|\(assignment.location ?? communityName)"
        }
        let sortedGroups = grouped.keys.sorted()
        let maxPosition = max(28, assignments.map(\.position).max() ?? 0)
        let headerCells = (1...maxPosition).map { "<th>P\($0)</th>" }.joined()

        let bodyRows = sortedGroups.map { key -> String in
            let parts = key.split(separator: "|", omittingEmptySubsequences: false).map(String.init)
            let group = grouped[key] ?? []
            var namesByPosition: [Int: String] = [:]
            for assignment in group {
                let name = assignment.scheduleDisplayName ?? assignment.ministerName ?? "VACANTE"
                namesByPosition[assignment.position] = escapeHTML(name)
            }

            let ministerCells = (1...maxPosition)
                .map { "<td>\(namesByPosition[$0] ?? "")</td>" }
                .joined()

            return """
            <tr>
              <td>\(escapeHTML(parts[safe: 0] ?? ""))</td>
              <td>\(escapeHTML(parts[safe: 1] ?? ""))</td>
              <td>\(escapeHTML(parts[safe: 2] ?? ""))</td>
              <td>\(escapeHTML(parts[safe: 3] ?? ""))</td>
              \(ministerCells)
            </tr>
            """
        }.joined(separator: "\n")

        return """
        <!doctype html>
        <html lang="pt-BR">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Escala MESC - \(escapeHTML(monthLabel))</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 24px; color: #2C2C2C; }
            h1 { font-family: Georgia, serif; color: #722F37; margin-bottom: 4px; }
            p { margin-top: 0; color: #666; }
            table { border-collapse: collapse; width: 100%; font-size: 12px; }
            th { background: #722F37; color: white; }
            th, td { border: 1px solid #D7C7A1; padding: 6px 7px; text-align: left; vertical-align: top; }
            tr:nth-child(even) td { background: #FDFBF7; }
          </style>
        </head>
        <body>
          <h1>Escala MESC - \(escapeHTML(monthLabel))</h1>
          <p>\(escapeHTML(communityName))</p>
          <table>
            <thead>
              <tr><th>Data</th><th>Hora</th><th>Tipo</th><th>Local</th>\(headerCells)</tr>
            </thead>
            <tbody>
              \(bodyRows.isEmpty ? "<tr><td colspan=\"\(maxPosition + 4)\">Sem escala publicada para este mês.</td></tr>" : bodyRows)
            </tbody>
          </table>
        </body>
        </html>
        """
    }

    private static func escapeHTML(_ value: String) -> String {
        value
            .replacingOccurrences(of: "&", with: "&amp;")
            .replacingOccurrences(of: "<", with: "&lt;")
            .replacingOccurrences(of: ">", with: "&gt;")
            .replacingOccurrences(of: "\"", with: "&quot;")
            .replacingOccurrences(of: "'", with: "&#39;")
    }

    private static func optionalText(_ value: String) -> String? {
        let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty ? nil : trimmed
    }

    private static func profileDateString(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone(secondsFromGMT: 0)
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: date)
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

private enum MESCProfileImageEncoder {
    static func jpegData(from image: UIImage) -> Data? {
        let maxDimension: CGFloat = 1_600
        let originalSize = image.size
        guard originalSize.width > 0, originalSize.height > 0 else { return nil }

        let scale = min(1, maxDimension / max(originalSize.width, originalSize.height))
        let targetSize = CGSize(width: originalSize.width * scale, height: originalSize.height * scale)
        let format = UIGraphicsImageRendererFormat.default()
        format.scale = 1
        let rendered = UIGraphicsImageRenderer(size: targetSize, format: format).image { _ in
            image.draw(in: CGRect(origin: .zero, size: targetSize))
        }

        var quality: CGFloat = 0.84
        var data = rendered.jpegData(compressionQuality: quality)
        while let currentData = data, currentData.count > 4 * 1024 * 1024, quality > 0.48 {
            quality -= 0.12
            data = rendered.jpegData(compressionQuality: quality)
        }
        return data
    }
}

struct MESCNativeRootView: View {
    @Environment(\.scenePhase) private var scenePhase
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
        .onChange(of: scenePhase) { phase in
            guard phase == .active else { return }
            Task { await appModel.refreshNativeNotificationState() }
        }
        .onChange(of: appModel.pendingNotificationDeepLink) { _ in
            routePendingNotificationIfPossible()
        }
        .onChange(of: appModel.sessionState) { _ in
            routePendingNotificationIfPossible()
        }
        .sheet(isPresented: $appModel.isNotificationCenterPresented) {
            MESCNotificationCenterSheet { deepLink in
                openNotification(deepLink)
            }
            .environmentObject(appModel)
        }
        .tint(MESCColor.primaryRed)
    }

    private var authenticatedShell: some View {
        TabView(selection: $selectedTab) {
            ForEach(MESCTab.allCases) { tab in
                MESCNativeTabPage {
                    screen(for: tab)
                }
                .tag(tab)
                .tabItem {
                    Label(tab.title, systemImage: tab.symbol)
                }
            }
        }
        .background(MESCBackground())
        .tint(MESCColor.accent)
    }

    @ViewBuilder
    private func screen(for tab: MESCTab) -> some View {
        switch tab {
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

    private func routePendingNotificationIfPossible() {
        guard appModel.sessionState == .authenticated,
              let deepLink = appModel.pendingNotificationDeepLink
        else {
            return
        }

        appModel.pendingNotificationDeepLink = nil
        UserDefaults.standard.removeObject(forKey: Notification.Name.mescRemoteNotificationDeepLinkStorageKey)
        openNotification(deepLink)
    }

    private func openNotification(_ deepLink: String) {
        appModel.isNotificationCenterPresented = false

        switch MESCNotificationDestination.resolve(deepLink) {
        case .questionnaire:
            selectedTab = .mission
            appModel.isQuestionnairePresentationRequested = true
        case .schedules:
            selectedTab = .schedules
        case .substitutions:
            selectedTab = .schedules
            appModel.isSubstitutionCenterPresentationRequested = true
        case .formation:
            selectedTab = .formation
        case .profile:
            selectedTab = .profile
        case .settings:
            selectedTab = .settings
        case .mission, .communication:
            selectedTab = .mission
        }
    }
}

struct MESCNativeTabPage<Content: View>: View {
    @ViewBuilder let content: Content

    var body: some View {
        ZStack {
            MESCBackground()
            content
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

private enum MESCNotificationDestination {
    case mission
    case questionnaire
    case schedules
    case substitutions
    case formation
    case profile
    case settings
    case communication

    static func resolve(_ deepLink: String) -> MESCNotificationDestination {
        let path = deepLink.split(separator: "?", maxSplits: 1).first.map(String.init) ?? deepLink

        if path == "/questionnaire" || path.hasPrefix("/questionnaires") {
            return .questionnaire
        }
        if path == "/formation" || path.hasPrefix("/formation/") {
            return .formation
        }
        if path == "/schedules/substitutions" || path.hasPrefix("/substitutions") {
            return .substitutions
        }
        if path == "/schedules" || path.hasPrefix("/schedules/") {
            return .schedules
        }
        if path == "/profile" {
            return .profile
        }
        if path == "/settings" {
            return .settings
        }
        if path == "/communication" || path == "/notifications" || path == "/notices" {
            return .communication
        }
        return .mission
    }
}

struct ShareFile: Identifiable {
    let id = UUID()
    let url: URL
}

struct SubstitutionTarget: Identifiable {
    let id: String
    let scheduleId: String
    let title: String
    let subtitle: String
}

struct MESCNotificationPreference: Identifiable {
    let key: String
    let title: String
    let detail: String
    let symbol: String

    var id: String { key }

    static let options = [
        MESCNotificationPreference(
            key: "questionnaire_published",
            title: "Novo questionário",
            detail: "Quando a coordenação publicar o questionário.",
            symbol: "list.clipboard"
        ),
        MESCNotificationPreference(
            key: "coordinator_announcement",
            title: "Avisos da coordenação",
            detail: "Comunicados importantes do ministério.",
            symbol: "megaphone"
        ),
        MESCNotificationPreference(
            key: "questionnaire_closed",
            title: "Encerramento do questionário",
            detail: "Aviso quando o prazo for encerrado.",
            symbol: "lock.doc"
        ),
        MESCNotificationPreference(
            key: "schedule_published",
            title: "Escala publicada",
            detail: "Quando uma nova escala estiver disponível.",
            symbol: "calendar.badge.checkmark"
        ),
        MESCNotificationPreference(
            key: "substitution_requested",
            title: "Pedidos de substituição",
            detail: "Quando alguém precisar de substituto.",
            symbol: "arrow.triangle.2.circlepath"
        ),
        MESCNotificationPreference(
            key: "substitute_accepted",
            title: "Substituto aceitou",
            detail: "Quando seu pedido for atendido.",
            symbol: "person.crop.circle.badge.checkmark"
        ),
        MESCNotificationPreference(
            key: "formation_available",
            title: "Novo treinamento",
            detail: "Quando houver nova aula ou material.",
            symbol: "graduationcap"
        ),
        MESCNotificationPreference(
            key: "schedule_reminder",
            title: "Lembrete de escalação",
            detail: "Antes da missa em que você foi escalado.",
            symbol: "bell.badge"
        ),
    ]

    static let defaults = Dictionary(uniqueKeysWithValues: options.map { ($0.key, true) })
}

struct ActivityView: UIViewControllerRepresentable {
    let activityItems: [Any]

    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: activityItems, applicationActivities: nil)
    }

    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
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
    @State private var substitutionTarget: SubstitutionTarget?

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
                    MESCPrimaryButton(
                        title: mission?.confirmationStatus == "confirmed" ? "Confirmado" : "Confirmar",
                        symbol: mission?.confirmationStatus == "confirmed" ? "checkmark.seal.fill" : "checkmark.circle"
                    ) {
                        guard let mission else { return }
                        Task { await appModel.confirmSchedule(scheduleId: mission.id) }
                    }
                    .disabled(mission?.canConfirm != true || appModel.isMutatingSchedule)

                    MESCSecondaryButton(title: "Trocar", symbol: "arrow.triangle.2.circlepath") {
                        guard let mission else { return }
                        substitutionTarget = SubstitutionTarget(
                            id: mission.id,
                            scheduleId: mission.id,
                            title: "\(MESCNativeAppModel.scheduleDateTitle(date: mission.date)) às \(MESCNativeAppModel.timeLabel(mission.time))",
                            subtitle: mission.location ?? appModel.activeCommunity?.name ?? "Comunidade"
                        )
                    }
                    .disabled(mission?.canRequestSubstitution != true || appModel.isMutatingSchedule)
                }

                if let message = appModel.scheduleActionMessage {
                    Label(message, systemImage: message.contains("sucesso") || message.contains("publicado") ? "checkmark.seal" : "info.circle")
                        .font(MESCFont.caption)
                        .foregroundStyle(message.contains("sucesso") || message.contains("publicado") ? MESCColor.accent : MESCColor.primaryWine)
                        .fixedSize(horizontal: false, vertical: true)
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
                SectionTitle(title: "Pendências e avisos", symbol: "bell.badge")
                let pendingActions = appModel.missionHome?.pendingActions ?? []
                let notices = appModel.missionHome?.notices ?? []

                if pendingActions.isEmpty && notices.isEmpty {
                    EmptyState(title: "Nada pendente agora", detail: "Quando houver avisos, questionários ou substituições, eles aparecerão aqui.")
                } else {
                    ForEach(pendingActions) { action in
                        Button {
                            if action.type == "questionnaire" {
                                isQuestionnairePresented = true
                            }
                        } label: {
                            PendingActionRow(action: action)
                        }
                        .buttonStyle(.plain)
                    }

                    ForEach(notices) { notice in
                        NoticeSummaryRow(notice: notice)
                    }
                }
            }
        }
        .sheet(isPresented: $isQuestionnairePresented) {
            QuestionnaireSheet()
                .environmentObject(appModel)
        }
        .sheet(item: $substitutionTarget) { target in
            SubstitutionRequestSheet(target: target)
                .environmentObject(appModel)
        }
        .onAppear {
            presentQuestionnaireIfRequested()
        }
        .onChange(of: appModel.isQuestionnairePresentationRequested) { _ in
            presentQuestionnaireIfRequested()
        }
    }

    private var questionnaireStatus: String {
        let hasQuestionnaire = appModel.missionHome?.pendingActions.contains { $0.type == "questionnaire" } ?? true
        return hasQuestionnaire ? "Questionário aberto" : "Questionário em dia"
    }

    private var noticesStatus: String {
        let count = appModel.unreadNotificationsCount
        return count == 1 ? "1 aviso" : "\(count) avisos"
    }

    private func presentQuestionnaireIfRequested() {
        guard appModel.isQuestionnairePresentationRequested else { return }
        appModel.isQuestionnairePresentationRequested = false
        isQuestionnairePresented = true
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

struct SubstitutionRequestSheet: View {
    @EnvironmentObject private var appModel: MESCNativeAppModel
    @Environment(\.dismiss) private var dismiss
    let target: SubstitutionTarget
    @State private var reason = ""

    var body: some View {
        ZStack {
            MESCBackground()

            VStack(alignment: .leading, spacing: 18) {
                GlassPanel(spacing: 12) {
                    HStack(alignment: .top, spacing: 12) {
                        SymbolTile(symbol: "arrow.triangle.2.circlepath", tint: MESCColor.gold)
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Pedido de substituição")
                                .font(MESCFont.caption)
                                .foregroundStyle(MESCColor.accent)
                            Text(target.title)
                                .font(MESCFont.title2)
                            Text(target.subtitle)
                                .font(MESCFont.body)
                                .foregroundStyle(MESCColor.textSecondary)
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

                GlassPanel(spacing: 12) {
                    SectionTitle(title: "Mensagem para quem puder ajudar", symbol: "text.bubble")
                    TextEditor(text: $reason)
                        .font(MESCFont.body)
                        .frame(minHeight: 110)
                        .padding(10)
                        .background(MESCColor.surface.opacity(0.72), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                        .overlay(
                            RoundedRectangle(cornerRadius: 14, style: .continuous)
                                .stroke(MESCColor.separator, lineWidth: 1)
                        )
                    Text("O pedido ficará disponível para ministros da sua comunidade. A coordenação acompanha o fluxo.")
                        .font(MESCFont.caption)
                        .foregroundStyle(MESCColor.textSecondary)
                        .fixedSize(horizontal: false, vertical: true)
                }

                if let message = appModel.scheduleActionMessage {
                    Label(message, systemImage: message.contains("publicado") ? "checkmark.seal" : "info.circle")
                        .font(MESCFont.caption)
                        .foregroundStyle(message.contains("publicado") ? MESCColor.accent : MESCColor.primaryWine)
                        .fixedSize(horizontal: false, vertical: true)
                }

                MESCPrimaryButton(
                    title: appModel.isMutatingSchedule ? "Publicando..." : "Publicar pedido",
                    symbol: "paperplane.fill"
                ) {
                    Task {
                        let success = await appModel.requestSubstitution(
                            scheduleId: target.scheduleId,
                            reason: reason.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : reason
                        )
                        if success {
                            dismiss()
                        }
                    }
                }
                .disabled(appModel.isMutatingSchedule)

                Spacer()
            }
            .padding(.horizontal, 18)
            .padding(.top, 22)
        }
    }
}

struct SubstitutionCenterLink: View {
    let openCount: Int
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 12) {
                SymbolTile(symbol: "arrow.triangle.2.circlepath", tint: MESCColor.gold)

                VStack(alignment: .leading, spacing: 3) {
                    Text("Trocas e substituições")
                        .font(MESCFont.cardTitle)
                        .foregroundStyle(MESCColor.textPrimary)
                    Text(openCount == 0 ? "Acompanhe seus pedidos ou ofereça ajuda." : String(openCount) + " pedido(s) aberto(s) para você ajudar.")
                        .font(MESCFont.caption)
                        .foregroundStyle(MESCColor.textSecondary)
                        .lineLimit(2)
                }

                Spacer(minLength: 8)

                if openCount > 0 {
                    Text("\(openCount)")
                        .font(.system(size: 13, weight: .bold, design: .rounded))
                        .foregroundStyle(.white)
                        .frame(minWidth: 25, minHeight: 25)
                        .background(MESCColor.primaryWine, in: Circle())
                }

                Image(systemName: "chevron.right")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(MESCColor.accent)
            }
            .padding(14)
            .frame(maxWidth: .infinity, alignment: .leading)
            .mescGlass(cornerRadius: 20)
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Trocas e substituições")
    }
}

struct SubstitutionCenterSheet: View {
    @EnvironmentObject private var appModel: MESCNativeAppModel
    @Environment(\.dismiss) private var dismiss
    @State private var substitutionToClaim: MobileSubstitutionDTO?

    private var currentUserId: String {
        appModel.user?.id ?? ""
    }

    private var openRequests: [MobileSubstitutionDTO] {
        appModel.substitutions.filter(canClaim)
    }

    private var myRequests: [MobileSubstitutionDTO] {
        appModel.substitutions.filter { $0.requesterId == currentUserId }
    }

    private var acceptedRequests: [MobileSubstitutionDTO] {
        appModel.substitutions.filter {
            $0.substituteId == currentUserId && $0.requesterId != currentUserId
        }
    }

    var body: some View {
        ZStack {
            MESCBackground()

            ScrollView(showsIndicators: false) {
                VStack(alignment: .leading, spacing: 16) {
                    header

                    if appModel.isLoadingSubstitutions && appModel.substitutions.isEmpty {
                        ProgressView()
                            .tint(MESCColor.accent)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 48)
                    } else {
                        if let message = appModel.substitutionMessage {
                            Label(message, systemImage: "exclamationmark.triangle")
                                .font(MESCFont.caption)
                                .foregroundStyle(MESCColor.primaryWine)
                                .fixedSize(horizontal: false, vertical: true)
                                .padding(.horizontal, 4)
                        }

                        if !openRequests.isEmpty {
                            SectionTitle(title: "Pedidos abertos", symbol: "person.2.badge.gearshape")
                                .padding(.horizontal, 4)

                            ForEach(openRequests) { substitution in
                                SubstitutionRow(
                                    substitution: substitution,
                                    isOwnRequest: false,
                                    canClaim: true
                                ) {
                                    substitutionToClaim = substitution
                                }
                            }
                        }

                        if !myRequests.isEmpty {
                            SectionTitle(title: "Meus pedidos", symbol: "clock.arrow.circlepath")
                                .padding(.horizontal, 4)

                            ForEach(myRequests) { substitution in
                                SubstitutionRow(
                                    substitution: substitution,
                                    isOwnRequest: true,
                                    canClaim: false
                                )
                            }
                        }

                        if !acceptedRequests.isEmpty {
                            SectionTitle(title: "Escalas que assumi", symbol: "checkmark.circle")
                                .padding(.horizontal, 4)

                            ForEach(acceptedRequests) { substitution in
                                SubstitutionRow(
                                    substitution: substitution,
                                    isOwnRequest: false,
                                    canClaim: false
                                )
                            }
                        }

                        if appModel.substitutions.isEmpty {
                            GlassPanel(spacing: 10) {
                                EmptyState(
                                    title: "Nenhuma substituição por enquanto",
                                    detail: "Quando um ministro pedir ajuda na sua comunidade, o pedido aparecerá aqui."
                                )
                            }
                        }
                    }
                }
                .padding(.horizontal, 18)
                .padding(.top, 22)
                .padding(.bottom, 34)
            }
        }
        .task {
            await appModel.loadSubstitutions()
        }
        .refreshable {
            await appModel.loadSubstitutions()
        }
        .sheet(item: $substitutionToClaim) { substitution in
            SubstitutionClaimSheet(substitution: substitution)
                .environmentObject(appModel)
        }
    }

    private var header: some View {
        HStack(alignment: .center, spacing: 12) {
            VStack(alignment: .leading, spacing: 5) {
                Text("Escalas")
                    .font(MESCFont.caption)
                    .foregroundStyle(MESCColor.accent)
                Text("Trocas e substituições")
                    .font(MESCFont.screenTitle)
                    .foregroundStyle(MESCColor.textPrimary)
            }

            Spacer()

            MESCIconButton(symbol: "xmark", accessibilityLabel: "Fechar substituições") {
                dismiss()
            }
        }
        .padding(16)
        .mescGlass(cornerRadius: 24, intensity: .floating)
    }

    private func canClaim(_ substitution: MobileSubstitutionDTO) -> Bool {
        let isOpen = substitution.status == "available" || (substitution.status == "pending" && substitution.substituteId == nil)
        return isOpen && substitution.requesterId != currentUserId
    }
}

struct SubstitutionRow: View {
    let substitution: MobileSubstitutionDTO
    let isOwnRequest: Bool
    let canClaim: Bool
    var onClaim: (() -> Void)?

    var body: some View {
        VStack(alignment: .leading, spacing: 13) {
            HStack(alignment: .top, spacing: 12) {
                SymbolTile(symbol: "arrow.triangle.2.circlepath", tint: urgencyTint)

                VStack(alignment: .leading, spacing: 4) {
                    Text(primaryTitle)
                        .font(MESCFont.cardTitle)
                        .foregroundStyle(MESCColor.textPrimary)
                        .fixedSize(horizontal: false, vertical: true)
                    Text("\(MESCNativeAppModel.scheduleDateTitle(date: substitution.schedule.date)) às \(MESCNativeAppModel.timeLabel(substitution.schedule.time))")
                        .font(MESCFont.caption)
                        .foregroundStyle(MESCColor.textSecondary)
                        .fixedSize(horizontal: false, vertical: true)
                }

                Spacer(minLength: 4)

                Text(statusTitle)
                    .font(MESCFont.caption2.weight(.bold))
                    .foregroundStyle(statusTint)
                    .multilineTextAlignment(.trailing)
                    .fixedSize(horizontal: false, vertical: true)
            }

            Label(scheduleDetail, systemImage: "mappin.and.ellipse")
                .font(MESCFont.caption)
                .foregroundStyle(MESCColor.textSecondary)
                .fixedSize(horizontal: false, vertical: true)

            if let reason = nonEmpty(substitution.reason) {
                Label(reason, systemImage: "text.bubble")
                    .font(MESCFont.caption)
                    .foregroundStyle(MESCColor.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
            }

            if let response = nonEmpty(substitution.responseMessage) {
                Label(response, systemImage: "checkmark.message")
                    .font(MESCFont.caption)
                    .foregroundStyle(MESCColor.accent)
                    .fixedSize(horizontal: false, vertical: true)
            }

            if canClaim, let onClaim {
                MESCPrimaryButton(title: "Assumir esta escala", symbol: "checkmark.circle", action: onClaim)
            } else if isOwnRequest && substitution.status == "available" {
                Label("Aguardando um ministro assumir esta escala.", systemImage: "clock")
                    .font(MESCFont.caption)
                    .foregroundStyle(MESCColor.gold)
            } else if let substitute = substitution.substitute {
                Label("Assumida por \(substitute.name)", systemImage: "person.crop.circle.badge.checkmark")
                    .font(MESCFont.caption)
                    .foregroundStyle(MESCColor.accent)
            }
        }
        .padding(15)
        .frame(maxWidth: .infinity, alignment: .leading)
        .mescGlass(cornerRadius: 20)
    }

    private var primaryTitle: String {
        if isOwnRequest {
            return "Seu pedido de substituição"
        }
        return "Pedido de \(substitution.requester?.name ?? "ministro da comunidade")"
    }

    private var scheduleDetail: String {
        let type = MESCNativeAppModel.scheduleTitle(type: substitution.schedule.type)
        if let location = nonEmpty(substitution.schedule.location) {
            return "\(type) • \(location)"
        }
        return type
    }

    private var statusTitle: String {
        switch substitution.status {
        case "available": return "Disponível"
        case "pending": return "Em análise"
        case "approved": return "Confirmada"
        case "rejected": return "Não aprovada"
        case "cancelled": return "Cancelada"
        default: return substitution.status.capitalized
        }
    }

    private var urgencyTint: Color {
        switch substitution.urgency {
        case "critical", "high": return MESCColor.primaryWine
        case "medium": return MESCColor.gold
        default: return MESCColor.accent
        }
    }

    private var statusTint: Color {
        switch substitution.status {
        case "approved": return MESCColor.accent
        case "available": return urgencyTint
        case "rejected", "cancelled": return MESCColor.primaryWine
        default: return MESCColor.textSecondary
        }
    }

    private func nonEmpty(_ value: String?) -> String? {
        guard let value = value?.trimmingCharacters(in: .whitespacesAndNewlines), !value.isEmpty else { return nil }
        return value
    }
}

struct SubstitutionClaimSheet: View {
    @EnvironmentObject private var appModel: MESCNativeAppModel
    @Environment(\.dismiss) private var dismiss
    let substitution: MobileSubstitutionDTO
    @State private var message = ""

    var body: some View {
        ZStack {
            MESCBackground()

            VStack(alignment: .leading, spacing: 18) {
                GlassPanel(spacing: 12) {
                    HStack(alignment: .top, spacing: 12) {
                        SymbolTile(symbol: "checkmark.circle", tint: MESCColor.accent)
                        VStack(alignment: .leading, spacing: 5) {
                            Text("Assumir substituição")
                                .font(MESCFont.caption)
                                .foregroundStyle(MESCColor.accent)
                            Text(MESCNativeAppModel.scheduleDateTitle(date: substitution.schedule.date))
                                .font(MESCFont.title2)
                            Text("às \(MESCNativeAppModel.timeLabel(substitution.schedule.time))")
                                .font(MESCFont.body)
                                .foregroundStyle(MESCColor.textSecondary)
                        }
                        Spacer()
                        MESCIconButton(symbol: "xmark", accessibilityLabel: "Cancelar aceite") {
                            dismiss()
                        }
                    }
                }

                GlassPanel(spacing: 10) {
                    SectionTitle(title: "Confirmação", symbol: "person.2")
                    Text("Você assumirá esta escala em nome de \(substitution.requester?.name ?? "um ministro da comunidade"). A atualização será registrada para a coordenação.")
                        .font(MESCFont.body)
                        .foregroundStyle(MESCColor.textSecondary)
                        .fixedSize(horizontal: false, vertical: true)

                    TextField("Mensagem opcional", text: $message)
                        .font(MESCFont.body)
                        .padding(14)
                        .background(MESCColor.surface.opacity(0.72), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                        .overlay(
                            RoundedRectangle(cornerRadius: 14, style: .continuous)
                                .stroke(MESCColor.separator, lineWidth: 1)
                        )
                }

                if let statusMessage = appModel.scheduleActionMessage {
                    Label(statusMessage, systemImage: statusMessage.contains("confirmada") ? "checkmark.seal" : "info.circle")
                        .font(MESCFont.caption)
                        .foregroundStyle(statusMessage.contains("confirmada") ? MESCColor.accent : MESCColor.primaryWine)
                        .fixedSize(horizontal: false, vertical: true)
                }

                MESCPrimaryButton(
                    title: appModel.isMutatingSchedule ? "Confirmando..." : "Confirmar substituição",
                    symbol: "checkmark.circle.fill"
                ) {
                    Task {
                        let didClaim = await appModel.claimSubstitution(
                            id: substitution.id,
                            message: message.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : message
                        )
                        if didClaim {
                            dismiss()
                        }
                    }
                }
                .disabled(appModel.isMutatingSchedule)

                Spacer()
            }
            .padding(.horizontal, 18)
            .padding(.top, 22)
        }
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

    var symbol: String {
        switch self {
        case .mine: return "person.crop.circle.badge.checkmark"
        case .month: return "calendar"
        case .full: return "tablecells"
        }
    }

    var detail: String {
        switch self {
        case .mine: return "Seus turnos"
        case .month: return "Mês atual"
        case .full: return "Lista oficial"
        }
    }
}

struct SchedulesScreen: View {
    @EnvironmentObject private var appModel: MESCNativeAppModel
    @State private var mode: ScheduleMode = .mine
    @State private var selectedDayNumber = Calendar.current.component(.day, from: Date())
    @State private var substitutionTarget: SubstitutionTarget?
    @State private var isSubstitutionCenterPresented = false
    @State private var shareFile: ShareFile?

    var body: some View {
        let days = appModel.scheduleDays(for: mode)
        let selectedDay = days.first(where: { $0.dayNumber == selectedDayNumber }) ?? days.first ?? ScheduleFixtures.days[0]
        let scheduledDaysCount = days.filter { !$0.missions.isEmpty }.count
        let totalMissionsCount = days.reduce(0) { $0 + $1.missions.count }
        let pendingConfirmationCount = days.flatMap(\.missions).filter { $0.canConfirm }.count

        MESCScrollScreen(title: "Escalas", subtitle: appModel.currentMonthLabel) {
            if appModel.isUsingFallbackData {
                FallbackBanner()
            }

            MESCGlassSegmentedControl(
                options: ScheduleMode.allCases,
                selection: $mode,
                title: { $0.rawValue },
                symbol: { $0.symbol }
            )

            SubstitutionCenterLink(
                openCount: appModel.substitutions.filter { $0.status == "available" && $0.requesterId != appModel.user?.id }.count
            ) {
                isSubstitutionCenterPresented = true
            }

            GlassPanel(spacing: 14) {
                HStack(alignment: .center, spacing: 12) {
                    MESCIconButton(symbol: "chevron.left", accessibilityLabel: "Mês anterior", isDisabled: appModel.isLoading) {
                        Task { await appModel.shiftScheduleMonth(by: -1) }
                    }

                    Spacer()
                    VStack(spacing: 4) {
                        Text(appModel.currentMonthLabel)
                            .font(MESCFont.cardTitle)
                        Text(mode.detail)
                            .font(MESCFont.caption)
                            .foregroundStyle(MESCColor.textSecondary)
                    }
                    Spacer()

                    MESCIconButton(symbol: "chevron.right", accessibilityLabel: "Próximo mês", isDisabled: appModel.isLoading) {
                        Task { await appModel.shiftScheduleMonth(by: 1) }
                    }
                }

                HStack(spacing: 10) {
                    StatusPill(title: "\(scheduledDaysCount) dias", symbol: "calendar.badge.checkmark", tint: MESCColor.accent)
                    StatusPill(title: "\(totalMissionsCount) missas", symbol: "list.bullet.clipboard", tint: MESCColor.gold)
                    StatusPill(title: "\(pendingConfirmationCount) pend.", symbol: "clock.badge", tint: pendingConfirmationCount == 0 ? MESCColor.textSecondary : MESCColor.primaryWine)
                }

                CalendarMonthGrid(
                    monthDate: appModel.currentMonthStartDate,
                    days: days,
                    selectedDay: selectedDay,
                    onSelect: { selectedDayNumber = $0.dayNumber }
                )
            }

            ScheduleDayPanel(
                day: selectedDay,
                mode: mode,
                onConfirm: { mission in
                    Task { await appModel.confirmSchedule(scheduleId: mission.scheduleId ?? mission.id) }
                },
                onRequestSubstitution: { mission in
                    substitutionTarget = SubstitutionTarget(
                        id: mission.id,
                        scheduleId: mission.scheduleId ?? mission.id,
                        title: "\(selectedDay.formattedTitle) às \(mission.time)",
                        subtitle: "\(mission.title) - \(mission.community)"
                    )
                }
            )

            GlassPanel(spacing: 12) {
                if let message = appModel.scheduleActionMessage {
                    Label(message, systemImage: message.contains("sucesso") || message.contains("publicado") ? "checkmark.seal" : "info.circle")
                        .font(MESCFont.caption)
                        .foregroundStyle(message.contains("sucesso") || message.contains("publicado") ? MESCColor.accent : MESCColor.primaryWine)
                        .fixedSize(horizontal: false, vertical: true)
                }

                MESCSecondaryButton(title: "Exportar modelo oficial", symbol: "square.and.arrow.up") {
                    do {
                        shareFile = ShareFile(url: try appModel.createOfficialScheduleExport())
                    } catch {
                        appModel.scheduleActionMessage = MESCMobileAPIClient.userMessage(for: error)
                    }
                }
            }
        }
        .sheet(item: $substitutionTarget) { target in
            SubstitutionRequestSheet(target: target)
                .environmentObject(appModel)
        }
        .sheet(isPresented: $isSubstitutionCenterPresented) {
            SubstitutionCenterSheet()
                .environmentObject(appModel)
        }
        .sheet(item: $shareFile) { file in
            ActivityView(activityItems: [file.url])
        }
        .task {
            await appModel.loadSubstitutions()
            presentSubstitutionCenterIfRequested()
        }
        .onAppear {
            presentSubstitutionCenterIfRequested()
        }
        .onChange(of: appModel.isSubstitutionCenterPresentationRequested) { _ in
            presentSubstitutionCenterIfRequested()
        }
        .onChange(of: mode) { _ in
            selectedDayNumber = suggestedDayNumber(from: appModel.scheduleDays(for: mode))
        }
        .onChange(of: appModel.selectedMonth) { _ in
            selectedDayNumber = suggestedDayNumber(from: appModel.scheduleDays(for: mode))
        }
    }

    private func suggestedDayNumber(from days: [ScheduleDay]) -> Int {
        if let firstWithMission = days.first(where: { !$0.missions.isEmpty }) {
            return firstWithMission.dayNumber
        }
        return days.first?.dayNumber ?? Calendar.current.component(.day, from: Date())
    }

    private func presentSubstitutionCenterIfRequested() {
        guard appModel.isSubstitutionCenterPresentationRequested else { return }
        appModel.isSubstitutionCenterPresentationRequested = false
        isSubstitutionCenterPresented = true
    }
}

struct ScheduleDayPanel: View {
    let day: ScheduleDay
    let mode: ScheduleMode
    let onConfirm: (ScheduleMission) -> Void
    let onRequestSubstitution: (ScheduleMission) -> Void

    var body: some View {
        GlassPanel(spacing: 14) {
            HStack(alignment: .top, spacing: 12) {
                SymbolTile(symbol: mode == .full ? "tablecells" : "calendar.badge.clock", tint: MESCColor.gold)
                VStack(alignment: .leading, spacing: 4) {
                    Text(day.formattedTitle)
                        .font(MESCFont.cardTitle)
                        .foregroundStyle(MESCColor.textPrimary)
                    Text(day.missions.isEmpty ? "Nenhuma missa publicada para esta data." : "\(day.missions.count) missa(s) nesta data.")
                        .font(MESCFont.caption)
                        .foregroundStyle(MESCColor.textSecondary)
                }
                Spacer()
            }

            if day.missions.isEmpty {
                EmptyState(title: "Sem escala nesta data", detail: "Toque em outro dia do calendário para consultar a escala publicada.")
            } else {
                VStack(spacing: 10) {
                    ForEach(day.missions) { mission in
                        ScheduleMissionRow(
                            mission: mission,
                            mode: mode,
                            onConfirm: mission.canConfirm && mission.scheduleId != nil ? {
                                onConfirm(mission)
                            } : nil,
                            onRequestSubstitution: mission.canRequestSubstitution && mission.scheduleId != nil ? {
                                onRequestSubstitution(mission)
                            } : nil
                        )
                    }
                }
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
                        let isSelected = selectedDay.id == day.id
                        let hasMission = !day.missions.isEmpty

                        VStack(spacing: 3) {
                            Text("\(day.dayNumber)")
                                .font(.system(size: 16, weight: isSelected ? .bold : .medium))
                            Circle()
                                .fill(hasMission ? (isSelected ? Color.white : MESCColor.gold) : Color.clear)
                                .frame(width: 5, height: 5)
                        }
                        .frame(maxWidth: .infinity)
                        .frame(height: 42)
                        .foregroundStyle(isSelected ? .white : MESCColor.textPrimary)
                        .background {
                            ZStack {
                                if hasMission && !isSelected {
                                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                                        .fill(.ultraThinMaterial)
                                }

                                RoundedRectangle(cornerRadius: 12, style: .continuous)
                                    .fill(isSelected ? MESCColor.primaryWine : (hasMission ? MESCColor.gold.opacity(0.10) : Color.clear))
                            }
                        }
                        .overlay {
                            RoundedRectangle(cornerRadius: 12, style: .continuous)
                                .stroke(isSelected ? MESCColor.gold.opacity(0.34) : (hasMission ? MESCColor.gold.opacity(0.18) : MESCColor.separator.opacity(0.18)), lineWidth: 1)
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
    @State private var isVideoLibraryPresented = false
    @State private var isStudioPresented = false

    var body: some View {
        MESCScrollScreen(title: "Formação", subtitle: "Trilhas e aulas") {
            if let overview = appModel.formationOverview {
                FormationOverviewPanel(
                    overview: overview,
                    isLoadingLesson: appModel.isLoadingFormationLesson,
                    onOpenLesson: openLesson
                )

                FormationActionStrip(
                    videoCount: appModel.formationVideoLessons.count,
                    canManageFormation: appModel.canManageFormation,
                    onOpenVideos: { isVideoLibraryPresented = true },
                    onOpenStudio: { isStudioPresented = true }
                )

                ForEach(overview.tracks) { track in
                    FormationTrackPanel(track: track, onOpenLesson: openLesson)
                }
            } else {
                GlassPanel(spacing: 14) {
                    SectionTitle(title: "Formação não carregada", symbol: "wifi.exclamationmark")
                    EmptyState(title: "Não foi possível carregar as aulas", detail: "Toque em Atualizar nos Ajustes para sincronizar novamente.")
                }
            }

            if let message = appModel.formationMessage {
                Label(message, systemImage: message.contains("sucesso") ? "checkmark.seal" : "info.circle")
                    .font(MESCFont.caption)
                    .foregroundStyle(message.contains("sucesso") ? MESCColor.accent : MESCColor.primaryWine)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .sheet(isPresented: $isLessonPresented, onDismiss: {
            appModel.formationLessonDetail = nil
        }) {
            FormationLessonSheet()
                .environmentObject(appModel)
        }
        .sheet(isPresented: $isVideoLibraryPresented) {
            FormationVideoLibrarySheet(onOpenLesson: openLesson)
                .environmentObject(appModel)
        }
        .sheet(isPresented: $isStudioPresented) {
            FormationAdminStudioSheet()
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

struct FormationOverviewPanel: View {
    let overview: MobileFormationOverviewDTO
    let isLoadingLesson: Bool
    let onOpenLesson: (MobileFormationLessonDTO) -> Void

    private var nextLesson: MobileFormationLessonDTO? {
        overview.tracks.compactMap(\.nextLesson).first
    }

    var body: some View {
        GlassPanel(spacing: 16) {
            HStack(alignment: .top, spacing: 12) {
                SymbolTile(symbol: "graduationcap", tint: MESCColor.gold)
                VStack(alignment: .leading, spacing: 5) {
                    Text("Formação contínua")
                        .font(MESCFont.caption)
                        .foregroundStyle(MESCColor.accent)
                    Text("\(overview.summary.percentageCompleted)% concluído")
                        .font(MESCFont.title2)
                        .foregroundStyle(MESCColor.textPrimary)
                    Text("\(overview.summary.completedLessons) de \(overview.summary.totalLessons) aulas concluídas")
                        .font(MESCFont.body)
                        .foregroundStyle(MESCColor.textSecondary)
                }
                Spacer()
            }

            ProgressView(value: Double(overview.summary.percentageCompleted), total: 100)
                .tint(MESCColor.accent)

            HStack(spacing: 10) {
                StatusPill(title: "\(overview.summary.totalTracks) trilhas", symbol: "map", tint: MESCColor.accent)
                StatusPill(title: "\(overview.summary.totalModules) módulos", symbol: "folder", tint: MESCColor.gold)
                StatusPill(title: "\(overview.summary.totalLessons) aulas", symbol: "book.closed", tint: MESCColor.primaryWine)
            }

            if let nextLesson {
                Divider().opacity(0.35)

                VStack(alignment: .leading, spacing: 10) {
                    SectionTitle(title: "Próxima aula", symbol: "play.circle")
                    Text(nextLesson.title)
                        .font(MESCFont.cardTitle)
                        .foregroundStyle(MESCColor.textPrimary)
                    Text("Aula \(nextLesson.lessonNumber)\(nextLesson.estimatedDuration.map { " - \($0) min" } ?? "")")
                        .font(MESCFont.caption)
                        .foregroundStyle(MESCColor.textSecondary)
                    MESCPrimaryButton(
                        title: isLoadingLesson ? "Abrindo..." : "Continuar",
                        symbol: "play.fill"
                    ) {
                        onOpenLesson(nextLesson)
                    }
                    .disabled(isLoadingLesson)
                }
            }
        }
    }
}

struct FormationActionStrip: View {
    let videoCount: Int
    let canManageFormation: Bool
    let onOpenVideos: () -> Void
    let onOpenStudio: () -> Void

    var body: some View {
        HStack(spacing: 10) {
            FormationActionButton(
                title: videoCount == 1 ? "1 vídeo" : "\(videoCount) vídeos",
                subtitle: "Biblioteca",
                symbol: "play.rectangle",
                tint: MESCColor.accent,
                action: onOpenVideos
            )

            if canManageFormation {
                FormationActionButton(
                    title: "Estúdio",
                    subtitle: "Coordenação",
                    symbol: "square.and.pencil",
                    tint: MESCColor.gold,
                    action: onOpenStudio
                )
            }
        }
    }
}

struct FormationActionButton: View {
    let title: String
    let subtitle: String
    let symbol: String
    let tint: Color
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 8) {
                SymbolTile(symbol: symbol, tint: tint)
                Text(title)
                    .font(MESCFont.body.weight(.semibold))
                    .foregroundStyle(MESCColor.textPrimary)
                    .lineLimit(1)
                    .minimumScaleFactor(0.78)
                Text(subtitle)
                    .font(MESCFont.caption)
                    .foregroundStyle(MESCColor.textSecondary)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(14)
            .mescGlass(cornerRadius: 20, intensity: .floating)
        }
        .buttonStyle(.plain)
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
                            FormationLessonSectionCard(
                                section: section,
                                isCompleted: detail.progress.completedSections?.contains(section.id) == true || detail.progress.status == "completed",
                                isCompleting: appModel.completingFormationSectionId == section.id,
                                isLessonCompleted: detail.progress.status == "completed"
                            ) {
                                Task { await appModel.completeFormationLessonSection(sectionId: section.id) }
                            }
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

struct FormationVideoLibrarySheet: View {
    @EnvironmentObject private var appModel: MESCNativeAppModel
    @Environment(\.dismiss) private var dismiss
    let onOpenLesson: (MobileFormationLessonDTO) -> Void

    var body: some View {
        ZStack {
            MESCBackground()

            ScrollView(showsIndicators: false) {
                VStack(alignment: .leading, spacing: 18) {
                    GlassPanel(spacing: 12) {
                        HStack(alignment: .top, spacing: 12) {
                            SymbolTile(symbol: "play.rectangle", tint: MESCColor.gold)
                            VStack(alignment: .leading, spacing: 6) {
                                Text("Formação")
                                    .font(MESCFont.caption)
                                    .foregroundStyle(MESCColor.accent)
                                Text("Vídeos disponíveis")
                                    .font(MESCFont.title2)
                                Text("Conteúdos publicados pela coordenação para estudo no app.")
                                    .font(MESCFont.body)
                                    .foregroundStyle(MESCColor.textSecondary)
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

                    if appModel.formationVideoLessons.isEmpty {
                        EmptyState(title: "Nenhum vídeo publicado", detail: "Quando a coordenação incluir vídeos nas aulas, eles aparecerão aqui.")
                    } else {
                        ForEach(appModel.formationVideoLessons) { lesson in
                            Button {
                                dismiss()
                                DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) {
                                    onOpenLesson(lesson)
                                }
                            } label: {
                                HStack(spacing: 12) {
                                    SymbolTile(symbol: "play.fill", tint: MESCColor.accent)
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text(lesson.title)
                                            .font(MESCFont.body.weight(.semibold))
                                            .foregroundStyle(MESCColor.textPrimary)
                                        Text("Aula \(lesson.lessonNumber)\(lesson.estimatedDuration.map { " - \($0) min" } ?? "")")
                                            .font(MESCFont.caption)
                                            .foregroundStyle(MESCColor.textSecondary)
                                    }
                                    Spacer()
                                    Image(systemName: "chevron.right")
                                        .foregroundStyle(MESCColor.textSecondary)
                                }
                                .padding(14)
                                .mescGlass(cornerRadius: 18)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
                .padding(.horizontal, 18)
                .padding(.top, 22)
                .padding(.bottom, 34)
            }
        }
    }
}

struct FormationAdminStudioSheet: View {
    @EnvironmentObject private var appModel: MESCNativeAppModel
    @Environment(\.dismiss) private var dismiss
    @State private var selectedModuleId = ""
    @State private var title = ""
    @State private var description = ""
    @State private var sectionContent = ""
    @State private var videoUrl = ""
    @State private var durationText = ""
    @State private var isActive = true

    var body: some View {
        ZStack {
            MESCBackground()

            ScrollView(showsIndicators: false) {
                VStack(alignment: .leading, spacing: 18) {
                    header

                    if let studio = appModel.formationAdminStudio {
                        summary(studio)
                        lessonForm
                        recentLessons(studio)
                    } else if appModel.isLoadingFormationStudio {
                        GlassPanel(spacing: 12) {
                            SectionTitle(title: "Carregando estúdio", symbol: "hourglass")
                            ProgressView()
                                .tint(MESCColor.accent)
                        }
                    } else {
                        EmptyState(title: "Estúdio indisponível", detail: "Toque em atualizar para carregar trilhas, módulos e aulas.")
                    }

                    if let message = appModel.formationMessage {
                        Label(message, systemImage: message.contains("sucesso") || message.contains("salva") ? "checkmark.seal" : "info.circle")
                            .font(MESCFont.caption)
                            .foregroundStyle(message.contains("sucesso") || message.contains("salva") ? MESCColor.accent : MESCColor.primaryWine)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                }
                .padding(.horizontal, 18)
                .padding(.top, 22)
                .padding(.bottom, 34)
            }
        }
        .task {
            await appModel.loadFormationAdminStudio()
            selectDefaultModuleIfNeeded()
        }
        .onChange(of: moduleIds) { _ in
            selectDefaultModuleIfNeeded()
        }
    }

    private var header: some View {
        GlassPanel(spacing: 12) {
            HStack(alignment: .top, spacing: 12) {
                SymbolTile(symbol: "square.and.pencil", tint: MESCColor.gold)
                VStack(alignment: .leading, spacing: 6) {
                    Text("Coordenação")
                        .font(MESCFont.caption)
                        .foregroundStyle(MESCColor.accent)
                    Text("Estúdio de formação")
                        .font(MESCFont.title2)
                    Text("Publique aulas, conteúdo e vídeos sem sair do app.")
                        .font(MESCFont.body)
                        .foregroundStyle(MESCColor.textSecondary)
                        .fixedSize(horizontal: false, vertical: true)
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

    private func summary(_ studio: MobileFormationAdminStudioDTO) -> some View {
        GlassPanel(spacing: 14) {
            SectionTitle(title: "Conteúdo publicado", symbol: "chart.bar.doc.horizontal")
            HStack(spacing: 10) {
                StatusPill(title: "\(studio.summary.totalLessons) aulas", symbol: "book.closed", tint: MESCColor.accent)
                StatusPill(title: "\(studio.summary.videoLessons) vídeos", symbol: "play.rectangle", tint: MESCColor.gold)
            }
            HStack(spacing: 10) {
                StatusPill(title: "\(studio.summary.totalModules) módulos", symbol: "folder", tint: MESCColor.primaryWine)
                StatusPill(title: "\(studio.summary.activeLessons) ativas", symbol: "checkmark.seal", tint: MESCColor.accent)
            }
        }
    }

    private var lessonForm: some View {
        GlassPanel(spacing: 14) {
            SectionTitle(title: "Nova aula", symbol: "plus.circle")

            if modules.isEmpty {
                EmptyState(title: "Nenhum módulo disponível", detail: "Crie ou ative módulos de formação antes de publicar novas aulas.")
            } else {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Módulo")
                        .font(MESCFont.caption)
                        .foregroundStyle(MESCColor.textSecondary)
                    Picker("Módulo", selection: $selectedModuleId) {
                        ForEach(modules) { module in
                            Text(module.title).tag(module.id)
                        }
                    }
                    .pickerStyle(.menu)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(12)
                    .background(MESCColor.surface.opacity(0.72), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                    .overlay(
                        RoundedRectangle(cornerRadius: 14, style: .continuous)
                            .stroke(MESCColor.gold.opacity(0.18), lineWidth: 1)
                    )
                }

                adminField("Título da aula", text: $title, placeholder: "Ex.: Cuidados no rito da comunhão")
                adminField("Descrição", text: $description, placeholder: "Resumo para os ministros")
                adminField("Duração em minutos", text: $durationText, placeholder: "Ex.: 12", keyboard: .numberPad)
                adminField("URL do vídeo", text: $videoUrl, placeholder: "https://...")

                VStack(alignment: .leading, spacing: 6) {
                    Text("Conteúdo inicial")
                        .font(MESCFont.caption)
                        .foregroundStyle(MESCColor.textSecondary)
                    TextEditor(text: $sectionContent)
                        .font(MESCFont.body)
                        .frame(minHeight: 112)
                        .padding(10)
                        .background(MESCColor.surface.opacity(0.72), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                        .overlay(
                            RoundedRectangle(cornerRadius: 14, style: .continuous)
                                .stroke(MESCColor.separator, lineWidth: 1)
                        )
                }

                Toggle(isOn: $isActive) {
                    VStack(alignment: .leading, spacing: 3) {
                        Text("Publicar agora")
                            .font(MESCFont.body.weight(.semibold))
                        Text("Quando ativo, os ministros recebem aviso de novo treinamento.")
                            .font(MESCFont.caption)
                            .foregroundStyle(MESCColor.textSecondary)
                    }
                }
                .tint(MESCColor.accent)
                .padding(12)
                .mescGlass(cornerRadius: 16)

                MESCPrimaryButton(
                    title: appModel.isSavingFormationContent ? "Salvando..." : "Salvar aula",
                    symbol: "tray.and.arrow.down"
                ) {
                    Task { await submitLesson() }
                }
                .disabled(appModel.isSavingFormationContent || selectedModuleId.isEmpty || trimmed(title).isEmpty)
                .opacity(appModel.isSavingFormationContent || selectedModuleId.isEmpty || trimmed(title).isEmpty ? 0.55 : 1)
            }
        }
    }

    private func recentLessons(_ studio: MobileFormationAdminStudioDTO) -> some View {
        GlassPanel(spacing: 12) {
            SectionTitle(title: "Aulas recentes", symbol: "clock.arrow.circlepath")
            let lessons = studio.tracks.flatMap { $0.modules }.flatMap { $0.lessons }
                .sorted { ($0.updatedAt ?? "") > ($1.updatedAt ?? "") }

            if lessons.isEmpty {
                EmptyState(title: "Sem aulas cadastradas", detail: "As novas aulas aparecerão aqui após o primeiro salvamento.")
            } else {
                ForEach(lessons.prefix(8)) { lesson in
                    FormationAdminLessonListRow(lesson: lesson)
                }
            }
        }
    }

    private var modules: [MobileFormationAdminModuleDTO] {
        appModel.formationAdminStudio?.tracks.flatMap { $0.modules } ?? []
    }

    private var moduleIds: [String] {
        modules.map(\.id)
    }

    private func selectDefaultModuleIfNeeded() {
        guard selectedModuleId.isEmpty || !moduleIds.contains(selectedModuleId) else { return }
        selectedModuleId = modules.first?.id ?? ""
    }

    private func adminField(
        _ label: String,
        text: Binding<String>,
        placeholder: String,
        keyboard: UIKeyboardType = .default
    ) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label)
                .font(MESCFont.caption)
                .foregroundStyle(MESCColor.textSecondary)
            TextField(placeholder, text: text)
                .font(MESCFont.body)
                .keyboardType(keyboard)
                .textInputAutocapitalization(label == "URL do vídeo" ? .never : .sentences)
                .autocorrectionDisabled(label == "URL do vídeo")
                .padding(14)
                .background(MESCColor.surface.opacity(0.72), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                        .stroke(MESCColor.separator, lineWidth: 1)
                )
        }
    }

    private func submitLesson() async {
        let duration = Int(trimmed(durationText))
        let payload = FormationAdminLessonRequestBody(
            moduleId: selectedModuleId,
            title: trimmed(title),
            description: nilIfEmpty(description),
            lessonNumber: nil,
            durationMinutes: duration,
            isActive: isActive,
            sectionTitle: nilIfEmpty(videoUrl) == nil ? "Conteúdo da aula" : "Vídeo da aula",
            sectionContent: nilIfEmpty(sectionContent),
            videoUrl: nilIfEmpty(videoUrl)
        )

        let didSave = await appModel.createFormationAdminLesson(payload)
        if didSave {
            title = ""
            description = ""
            sectionContent = ""
            videoUrl = ""
            durationText = ""
            isActive = true
        }
    }

    private func trimmed(_ value: String) -> String {
        value.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private func nilIfEmpty(_ value: String) -> String? {
        let cleaned = trimmed(value)
        return cleaned.isEmpty ? nil : cleaned
    }
}

struct FormationAdminLessonListRow: View {
    let lesson: MobileFormationAdminLessonDTO

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            SymbolTile(symbol: lesson.videoUrl == nil ? "text.book.closed" : "play.rectangle", tint: lesson.isActive ? MESCColor.accent : MESCColor.textSecondary)
            VStack(alignment: .leading, spacing: 4) {
                Text(lesson.title)
                    .font(MESCFont.body.weight(.semibold))
                    .foregroundStyle(MESCColor.textPrimary)
                    .lineLimit(2)
                HStack(spacing: 8) {
                    Text("Aula \(lesson.lessonNumber)")
                    if let duration = lesson.estimatedDuration {
                        Text("\(duration) min")
                    }
                    Text("\(lesson.sectionsCount) seções")
                }
                .font(MESCFont.caption)
                .foregroundStyle(MESCColor.textSecondary)
                Text(lesson.isActive ? "Publicada" : "Rascunho")
                    .font(MESCFont.caption2.weight(.semibold))
                    .foregroundStyle(lesson.isActive ? MESCColor.accent : MESCColor.textSecondary)
            }
            Spacer()
        }
        .padding(12)
        .mescGlass(cornerRadius: 16)
    }
}

struct FormationLessonSectionCard: View {
    let section: MobileFormationLessonSectionDTO
    let isCompleted: Bool
    let isCompleting: Bool
    let isLessonCompleted: Bool
    let onComplete: () -> Void

    var body: some View {
        GlassPanel(spacing: 10) {
            HStack(alignment: .top, spacing: 10) {
                SectionTitle(title: section.title, symbol: isCompleted ? "checkmark.seal.fill" : sectionSymbol)
                Spacer(minLength: 8)
                if isCompleted {
                    Label("Concluída", systemImage: "checkmark.circle.fill")
                        .font(MESCFont.caption2.weight(.semibold))
                        .foregroundStyle(MESCColor.accent)
                }
            }

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

            if !isCompleted {
                Button(action: onComplete) {
                    Label(isCompleting ? "Concluindo..." : "Marcar seção como concluída", systemImage: isCompleting ? "hourglass" : "checkmark.circle")
                        .font(MESCFont.caption.weight(.semibold))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                        .background(MESCColor.surface.opacity(0.58), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                }
                .buttonStyle(.plain)
                .foregroundStyle(MESCColor.accent)
                .disabled(isCompleting || isLessonCompleted)
            }
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
    @State private var isProfileEditorPresented = false
    @State private var photoSource: ProfilePhotoSource?
    @State private var isRemovePhotoConfirmationPresented = false

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
                    ProfileAvatar(image: appModel.profileImage, initials: initials, size: 68)

                    VStack(alignment: .leading, spacing: 4) {
                        Text(name)
                            .font(MESCFont.cardTitle)
                        Text("\(appModel.user?.role.capitalized ?? "Ministro") - \(appModel.activeCommunity?.name ?? "Comunidade")")
                            .font(MESCFont.body)
                            .foregroundStyle(MESCColor.textSecondary)
                    }
                    Spacer()

                    Menu {
                        Button("Tirar foto", systemImage: "camera") {
                            photoSource = .camera
                        }
                        .disabled(!UIImagePickerController.isSourceTypeAvailable(.camera))

                        Button("Escolher da biblioteca", systemImage: "photo.on.rectangle") {
                            photoSource = .library
                        }

                        if appModel.profileImage != nil || appModel.profile?.photoUrl != nil {
                            Button("Remover foto", systemImage: "trash", role: .destructive) {
                                isRemovePhotoConfirmationPresented = true
                            }
                        }
                    } label: {
                        Image(systemName: appModel.isUpdatingProfilePhoto ? "hourglass" : "camera.fill")
                            .font(.system(size: 17, weight: .semibold))
                            .frame(width: 38, height: 38)
                            .background(.thinMaterial, in: Circle())
                    }
                    .disabled(appModel.isUpdatingProfilePhoto)
                }

                ProfileInfoRow(title: "Email", value: email)
                ProfileInfoRow(title: "Celular", value: appModel.profile?.phone ?? "Não informado")
                ProfileInfoRow(title: "WhatsApp", value: appModel.profile?.whatsapp ?? "Não informado")
                ProfileInfoRow(title: "Comunidade", value: appModel.activeCommunity?.name ?? "Não carregada")
                ProfileInfoRow(title: "Paróquia", value: appModel.activeCommunity?.parishName ?? "São Judas Tadeu")

                MESCSecondaryButton(title: "Editar dados", symbol: "square.and.pencil") {
                    isProfileEditorPresented = true
                }
            }

            GlassPanel(spacing: 14) {
                SectionTitle(title: "Resumo do mês", symbol: "chart.bar")
                ProfileInfoRow(
                    title: "Escalas publicadas",
                    value: "\(appModel.missionHome?.monthlySummary.publishedAssignments ?? 0)"
                )
                ProfileInfoRow(
                    title: "Mês ativo",
                    value: appModel.currentMonthLabel
                )
                ProfileInfoRow(
                    title: "Notificações",
                    value: appModel.pushStatusText
                )
            }

            if let message = appModel.profileMessage {
                Label(message, systemImage: message.contains("atualizada") || message.contains("atualizados") || message.contains("removida") ? "checkmark.seal" : "info.circle")
                    .font(MESCFont.caption)
                    .foregroundStyle(message.contains("atualizada") || message.contains("atualizados") || message.contains("removida") ? MESCColor.accent : MESCColor.primaryWine)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .sheet(isPresented: $isProfileEditorPresented) {
            ProfileEditorSheet(profile: appModel.profile)
                .environmentObject(appModel)
        }
        .sheet(item: $photoSource) { source in
            NativeProfileImagePicker(sourceType: source.sourceType) { image in
                Task { await appModel.uploadProfilePhoto(image) }
            }
            .ignoresSafeArea()
        }
        .confirmationDialog(
            "Remover foto de perfil?",
            isPresented: $isRemovePhotoConfirmationPresented,
            titleVisibility: .visible
        ) {
            Button("Remover foto", role: .destructive) {
                Task { await appModel.removeProfilePhoto() }
            }
        } message: {
            Text("A foto será removida deste cadastro e substituída pelas iniciais do nome.")
        }
    }
}

private enum ProfilePhotoSource: String, Identifiable {
    case camera
    case library

    var id: String { rawValue }

    var sourceType: UIImagePickerController.SourceType {
        switch self {
        case .camera:
            return .camera
        case .library:
            return .photoLibrary
        }
    }
}

private struct ProfileAvatar: View {
    let image: UIImage?
    let initials: String
    let size: CGFloat

    var body: some View {
        Group {
            if let image {
                Image(uiImage: image)
                    .resizable()
                    .scaledToFill()
            } else {
                Circle()
                    .fill(
                        LinearGradient(
                            colors: [MESCColor.primaryWine, MESCColor.primaryRed],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .overlay(
                        Text(initials.isEmpty ? "M" : initials)
                            .font(.system(size: size * 0.33, weight: .bold))
                            .foregroundStyle(.white)
                    )
            }
        }
        .frame(width: size, height: size)
        .clipShape(Circle())
        .overlay(Circle().stroke(MESCColor.gold.opacity(0.45), lineWidth: 1))
    }
}

private struct ProfileEditorSheet: View {
    @EnvironmentObject private var appModel: MESCNativeAppModel
    @Environment(\.dismiss) private var dismiss
    @State private var name: String
    @State private var phone: String
    @State private var whatsapp: String
    @State private var scheduleDisplayName: String
    @State private var ministryStartDate: Date?
    @State private var maritalStatus: String

    init(profile: MobileProfileDTO?) {
        _name = State(initialValue: profile?.name ?? "")
        _phone = State(initialValue: profile?.phone ?? "")
        _whatsapp = State(initialValue: profile?.whatsapp ?? "")
        _scheduleDisplayName = State(initialValue: profile?.scheduleDisplayName ?? "")
        _ministryStartDate = State(initialValue: Self.parseDate(profile?.ministryStartDate))
        _maritalStatus = State(initialValue: profile?.maritalStatus ?? "")
    }

    var body: some View {
        NavigationView {
            Form {
                Section("Identificação") {
                    TextField("Nome completo", text: $name)
                        .textContentType(.name)
                        .textInputAutocapitalization(.words)
                    TextField("Nome na escala", text: $scheduleDisplayName)
                        .textInputAutocapitalization(.words)
                }

                Section("Contato") {
                    TextField("Celular", text: $phone)
                        .keyboardType(.phonePad)
                        .textContentType(.telephoneNumber)
                    TextField("WhatsApp", text: $whatsapp)
                        .keyboardType(.phonePad)
                        .textContentType(.telephoneNumber)
                }

                Section("Ministério") {
                    DatePicker(
                        "Início no ministério",
                        selection: Binding(
                            get: { ministryStartDate ?? Date() },
                            set: { ministryStartDate = $0 }
                        ),
                        displayedComponents: .date
                    )
                    Picker("Estado civil", selection: $maritalStatus) {
                        Text("Não informado").tag("")
                        Text("Solteiro(a)").tag("Solteiro(a)")
                        Text("Casado(a)").tag("Casado(a)")
                        Text("Viúvo(a)").tag("Viúvo(a)")
                        Text("Divorciado(a)").tag("Divorciado(a)")
                    }
                }

                if let email = appModel.profile?.email ?? appModel.user?.email {
                    Section("Conta") {
                        HStack {
                            Text("E-mail")
                            Spacer()
                            Text(email)
                                .foregroundStyle(.secondary)
                                .multilineTextAlignment(.trailing)
                        }
                    }
                }
            }
            .navigationTitle("Editar perfil")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancelar") { dismiss() }
                        .disabled(appModel.isSavingProfile)
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(appModel.isSavingProfile ? "Salvando..." : "Salvar") {
                        Task {
                            let saved = await appModel.saveProfile(
                                name: name,
                                phone: phone,
                                whatsapp: whatsapp,
                                scheduleDisplayName: scheduleDisplayName,
                                ministryStartDate: ministryStartDate,
                                maritalStatus: maritalStatus
                            )
                            if saved { dismiss() }
                        }
                    }
                    .disabled(appModel.isSavingProfile || name.trimmingCharacters(in: .whitespacesAndNewlines).count < 3)
                }
            }
        }
    }

    private static func parseDate(_ value: String?) -> Date? {
        guard let value, !value.isEmpty else { return nil }
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone(secondsFromGMT: 0)
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.date(from: value)
    }
}

private struct NativeProfileImagePicker: UIViewControllerRepresentable {
    let sourceType: UIImagePickerController.SourceType
    let onImagePicked: (UIImage) -> Void
    @Environment(\.dismiss) private var dismiss

    func makeCoordinator() -> Coordinator {
        Coordinator(parent: self)
    }

    func makeUIViewController(context: Context) -> UIImagePickerController {
        let picker = UIImagePickerController()
        picker.sourceType = sourceType
        picker.allowsEditing = true
        picker.delegate = context.coordinator
        return picker
    }

    func updateUIViewController(_ uiViewController: UIImagePickerController, context: Context) {}

    final class Coordinator: NSObject, UINavigationControllerDelegate, UIImagePickerControllerDelegate {
        private let parent: NativeProfileImagePicker

        init(parent: NativeProfileImagePicker) {
            self.parent = parent
        }

        func imagePickerController(
            _ picker: UIImagePickerController,
            didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]
        ) {
            let image = (info[.editedImage] ?? info[.originalImage]) as? UIImage
            parent.dismiss()
            if let image {
                parent.onImagePicked(image)
            }
        }

        func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
            parent.dismiss()
        }
    }
}

struct SettingsScreen: View {
    @EnvironmentObject private var appModel: MESCNativeAppModel

    var body: some View {
        MESCScrollScreen(title: "Ajustes", subtitle: "Permissões e preferências") {
            GlassPanel(spacing: 16) {
                SectionTitle(title: "Central do aparelho", symbol: "iphone")
                NativePermissionRow(
                    title: "Notificações push",
                    detail: appModel.pushPermissionDetail,
                    status: appModel.pushStatusText,
                    symbol: "bell",
                    isEnabled: appModel.pushLinkedToServer,
                    actionTitle: appModel.pushActionTitle
                ) {
                    Task { await appModel.requestPushNotifications() }
                }
                Label(appModel.pushConnectionText, systemImage: appModel.pushLinkedToServer ? "checkmark.icloud" : "iphone.badge.exclamationmark")
                    .font(MESCFont.caption)
                    .foregroundStyle(appModel.pushLinkedToServer ? MESCColor.gold : MESCColor.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
                if let message = appModel.pushPermissionMessage {
                    Label(message, systemImage: "info.circle")
                        .font(MESCFont.caption)
                        .foregroundStyle(MESCColor.textSecondary)
                        .fixedSize(horizontal: false, vertical: true)
                }
                SettingsToggleRow(
                    title: appModel.biometricTypeLabel,
                    detail: appModel.biometricAvailable ? "Permitir desbloqueio biométrico depois do login." : "Biometria não disponível neste aparelho.",
                    symbol: "faceid",
                    isOn: biometricBinding
                )
                .disabled(!appModel.biometricAvailable || appModel.isUpdatingSettings)

                NativePermissionRow(
                    title: "Camera e fotos",
                    detail: "Será solicitada no momento de foto de perfil, aula ou anexo.",
                    status: "Sob demanda",
                    symbol: "camera",
                    isEnabled: false,
                    actionTitle: "Ajustes"
                ) {
                    appModel.openSystemSettings()
                }
                NativePermissionRow(
                    title: "Localização",
                    detail: "Somente para fluxos pastorais aprovados no PRD.",
                    status: "Sob demanda",
                    symbol: "location",
                    isEnabled: false,
                    actionTitle: "Ajustes"
                ) {
                    appModel.openSystemSettings()
                }
            }

            GlassPanel(spacing: 16) {
                SectionTitle(title: "Preferências por tipo", symbol: "slider.horizontal.3")
                ForEach(MESCNotificationPreference.options) { option in
                    SettingsToggleRow(
                        title: option.title,
                        detail: option.detail,
                        symbol: option.symbol,
                        isOn: notificationBinding(option.key)
                    )
                    .disabled(appModel.isUpdatingSettings)
                }
            }

            if let message = appModel.settingsMessage {
                Label(message, systemImage: message.contains("atualizadas") || message.contains("registrado") ? "checkmark.seal" : "info.circle")
                    .font(MESCFont.caption)
                    .foregroundStyle(message.contains("atualizadas") || message.contains("registrado") ? MESCColor.accent : MESCColor.primaryWine)
                    .fixedSize(horizontal: false, vertical: true)
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
            await appModel.refreshNativeNotificationState()
        }
    }

    private var biometricBinding: Binding<Bool> {
        Binding(
            get: { appModel.biometricEnabled },
            set: { enabled in
                Task { await appModel.setBiometricPreference(enabled) }
            }
        )
    }

    private func notificationBinding(_ key: String) -> Binding<Bool> {
        Binding(
            get: { appModel.notificationPreferences[key] ?? true },
            set: { enabled in
                Task { await appModel.setNotificationPreference(key: key, enabled: enabled) }
            }
        )
    }
}

struct MESCScrollScreen<Content: View>: View {
    @EnvironmentObject private var appModel: MESCNativeAppModel
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

                    MESCNotificationBell(unreadCount: appModel.unreadNotificationsCount) {
                        appModel.isNotificationCenterPresented = true
                    }

                    Image(systemName: "cross.case.fill")
                        .font(.system(size: 24, weight: .semibold))
                        .foregroundStyle(MESCColor.gold)
                        .frame(width: 44, height: 44)
                        .mescGlass(cornerRadius: 16)
                }
                .padding(16)
                .mescGlass(cornerRadius: 24, intensity: .floating)
                .padding(.top, 20)

                content
            }
            .padding(.horizontal, 18)
            .padding(.bottom, 28)
        }
    }
}

struct MESCNotificationBell: View {
    let unreadCount: Int
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            ZStack(alignment: .topTrailing) {
                Image(systemName: unreadCount > 0 ? "bell.badge.fill" : "bell")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundStyle(MESCColor.accent)
                    .frame(width: 42, height: 42)
                    .mescGlass(cornerRadius: 14)

                if unreadCount > 0 {
                    Text(unreadCount > 9 ? "9+" : "\(unreadCount)")
                        .font(.system(size: 10, weight: .bold, design: .rounded))
                        .foregroundStyle(.white)
                        .frame(minWidth: 17, minHeight: 17)
                        .padding(.horizontal, unreadCount > 9 ? 2 : 0)
                        .background(MESCColor.primaryWine, in: Capsule())
                        .overlay(Capsule().stroke(MESCColor.surface.opacity(0.9), lineWidth: 1))
                        .offset(x: 5, y: -5)
                }
            }
        }
        .buttonStyle(.plain)
        .accessibilityLabel(unreadCount == 0 ? "Notificações" : "Notificações, \(unreadCount) não lidas")
    }
}

struct MESCNotificationCenterSheet: View {
    @EnvironmentObject private var appModel: MESCNativeAppModel
    @Environment(\.dismiss) private var dismiss
    let onOpenDeepLink: (String) -> Void

    var body: some View {
        ZStack {
            MESCBackground()

            ScrollView(showsIndicators: false) {
                VStack(alignment: .leading, spacing: 16) {
                    header

                    if appModel.isLoadingNotifications && appModel.notifications.isEmpty {
                        ProgressView()
                            .tint(MESCColor.accent)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 44)
                    } else if appModel.notifications.isEmpty {
                        GlassPanel(spacing: 10) {
                            VStack(spacing: 10) {
                                Image(systemName: "bell.slash")
                                    .font(.system(size: 28, weight: .semibold))
                                    .foregroundStyle(MESCColor.gold)
                                Text("Nenhum aviso por enquanto")
                                    .font(MESCFont.body.weight(.semibold))
                                Text("Questionários, escalas, substituições e formações aparecerão aqui.")
                                    .font(MESCFont.caption)
                                    .foregroundStyle(MESCColor.textSecondary)
                                    .multilineTextAlignment(.center)
                            }
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 18)
                        }
                    } else {
                        if appModel.unreadNotificationsCount > 0 {
                            MESCSecondaryButton(
                                title: appModel.isMarkingAllNotificationsRead ? "Marcando..." : "Marcar todas como lidas",
                                symbol: "checkmark.circle"
                            ) {
                                Task { await appModel.markAllNotificationsRead() }
                            }
                            .disabled(appModel.isMarkingAllNotificationsRead)
                        }

                        if let message = appModel.notificationMessage {
                            Label(message, systemImage: "exclamationmark.triangle")
                                .font(MESCFont.caption)
                                .foregroundStyle(MESCColor.primaryWine)
                                .fixedSize(horizontal: false, vertical: true)
                                .padding(.horizontal, 4)
                        }

                        ForEach(appModel.notifications) { notification in
                            Button {
                                Task {
                                    _ = await appModel.markNotificationRead(notification)
                                    dismiss()
                                    onOpenDeepLink(notification.deepLink)
                                }
                            } label: {
                                MESCNotificationRow(
                                    notification: notification,
                                    isMarkingRead: appModel.markingNotificationId == notification.id
                                )
                            }
                            .buttonStyle(.plain)
                            .disabled(appModel.markingNotificationId == notification.id)
                        }
                    }
                }
                .padding(.horizontal, 18)
                .padding(.top, 22)
                .padding(.bottom, 34)
            }
        }
        .task {
            await appModel.loadNotifications()
        }
        .refreshable {
            await appModel.loadNotifications()
        }
    }

    private var header: some View {
        HStack(alignment: .center, spacing: 12) {
            VStack(alignment: .leading, spacing: 5) {
                Text("Central")
                    .font(MESCFont.caption)
                    .foregroundStyle(MESCColor.accent)
                Text("Notificações")
                    .font(MESCFont.screenTitle)
                    .foregroundStyle(MESCColor.textPrimary)
            }

            Spacer()

            MESCIconButton(symbol: "xmark", accessibilityLabel: "Fechar notificações") {
                dismiss()
            }
        }
        .padding(16)
        .mescGlass(cornerRadius: 24, intensity: .floating)
    }
}

struct MESCNotificationRow: View {
    let notification: MobileNotificationDTO
    let isMarkingRead: Bool

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            SymbolTile(symbol: symbol, tint: tint)

            VStack(alignment: .leading, spacing: 5) {
                Text(notification.title)
                    .font(MESCFont.body.weight(notification.read ? .medium : .bold))
                    .foregroundStyle(MESCColor.textPrimary)
                    .multilineTextAlignment(.leading)
                Text(notification.message)
                    .font(MESCFont.caption)
                    .foregroundStyle(MESCColor.textSecondary)
                    .multilineTextAlignment(.leading)
                    .fixedSize(horizontal: false, vertical: true)
                if let createdAt = notification.createdAt {
                    Text(MESCNativeAppModel.compactDateTimeLabel(createdAt))
                        .font(MESCFont.caption2)
                        .foregroundStyle(MESCColor.textSecondary)
                }
            }

            Spacer(minLength: 4)

            if isMarkingRead {
                ProgressView()
                    .tint(MESCColor.accent)
            } else if !notification.read {
                Circle()
                    .fill(MESCColor.gold)
                    .frame(width: 9, height: 9)
            }
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .mescGlass(cornerRadius: 18)
        .opacity(notification.read ? 0.78 : 1)
    }

    private var symbol: String {
        switch notification.type {
        case "schedule":
            return "calendar"
        case "substitution":
            return "arrow.triangle.2.circlepath"
        case "formation":
            return "graduationcap"
        case "questionnaire":
            return "list.clipboard"
        case "announcement":
            return "megaphone"
        default:
            return "bell"
        }
    }

    private var tint: Color {
        if notification.priority == "high" {
            return MESCColor.primaryWine
        }
        return notification.read ? MESCColor.textSecondary : MESCColor.accent
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

struct MESCGlassSegmentedControl<Option: Identifiable & Hashable>: View {
    let options: [Option]
    @Binding var selection: Option
    let title: (Option) -> String
    let symbol: (Option) -> String

    var body: some View {
        HStack(spacing: 6) {
            ForEach(options) { option in
                let isSelected = selection == option

                Button {
                    withAnimation(.spring(response: 0.26, dampingFraction: 0.86)) {
                        selection = option
                    }
                } label: {
                    VStack(spacing: 5) {
                        Image(systemName: symbol(option))
                            .font(.system(size: 17, weight: .semibold))
                        Text(title(option))
                            .font(MESCFont.caption2.weight(.semibold))
                            .lineLimit(1)
                            .minimumScaleFactor(0.70)
                    }
                    .frame(maxWidth: .infinity)
                    .frame(height: 58)
                    .foregroundStyle(isSelected ? MESCColor.accent : MESCColor.textSecondary)
                    .background {
                        RoundedRectangle(cornerRadius: 16, style: .continuous)
                            .fill(isSelected ? MESCColor.gold.opacity(0.14) : Color.clear)
                            .background(isSelected ? .thinMaterial : .ultraThinMaterial, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                    }
                    .overlay {
                        RoundedRectangle(cornerRadius: 16, style: .continuous)
                            .stroke(isSelected ? MESCColor.gold.opacity(0.32) : MESCColor.separator.opacity(0.26), lineWidth: 1)
                    }
                }
                .buttonStyle(.plain)
                .accessibilityLabel(title(option))
            }
        }
        .padding(6)
        .mescGlass(cornerRadius: 22, intensity: .floating)
    }
}

struct MESCIconButton: View {
    let symbol: String
    let accessibilityLabel: String
    var isDisabled = false
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Image(systemName: symbol)
                .font(.system(size: 16, weight: .bold))
                .foregroundStyle(isDisabled ? MESCColor.textSecondary.opacity(0.45) : MESCColor.accent)
                .frame(width: 42, height: 42)
                .mescGlass(cornerRadius: 14)
        }
        .buttonStyle(.plain)
        .disabled(isDisabled)
        .accessibilityLabel(accessibilityLabel)
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

struct PendingActionRow: View {
    let action: MobilePendingActionDTO

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            SymbolTile(symbol: symbol, tint: tint)
            VStack(alignment: .leading, spacing: 4) {
                Text(action.title)
                    .font(MESCFont.body.weight(.semibold))
                    .foregroundStyle(MESCColor.textPrimary)
                if let subtitle = action.subtitle, !subtitle.isEmpty {
                    Text(subtitle)
                        .font(MESCFont.caption)
                        .foregroundStyle(MESCColor.textSecondary)
                        .fixedSize(horizontal: false, vertical: true)
                }
                if let dueAt = action.dueAt {
                    Text("Prazo: \(MESCNativeAppModel.compactDateTimeLabel(dueAt))")
                        .font(MESCFont.caption2)
                        .foregroundStyle(MESCColor.accent)
                }
            }
            Spacer()
            Image(systemName: "chevron.right")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(MESCColor.textSecondary)
        }
        .padding(12)
        .background(MESCColor.surface.opacity(0.68), in: RoundedRectangle(cornerRadius: 18, style: .continuous))
    }

    private var symbol: String {
        switch action.type {
        case "questionnaire":
            return "list.clipboard"
        case "substitution":
            return "arrow.triangle.2.circlepath"
        default:
            return "exclamationmark.circle"
        }
    }

    private var tint: Color {
        action.priority == "high" ? MESCColor.primaryWine : MESCColor.gold
    }
}

struct NoticeSummaryRow: View {
    let notice: MobileNoticeDTO

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            SymbolTile(symbol: symbol, tint: notice.read ? MESCColor.textSecondary : MESCColor.accent)
            VStack(alignment: .leading, spacing: 4) {
                Text(notice.title)
                    .font(MESCFont.body.weight(.semibold))
                    .foregroundStyle(MESCColor.textPrimary)
                Text(notice.message)
                    .font(MESCFont.caption)
                    .foregroundStyle(MESCColor.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
                if let createdAt = notice.createdAt {
                    Text(MESCNativeAppModel.compactDateTimeLabel(createdAt))
                        .font(MESCFont.caption2)
                        .foregroundStyle(MESCColor.textSecondary)
                }
            }
            Spacer()
            if !notice.read {
                Circle()
                    .fill(MESCColor.gold)
                    .frame(width: 8, height: 8)
            }
        }
        .padding(12)
        .background(MESCColor.surface.opacity(0.68), in: RoundedRectangle(cornerRadius: 18, style: .continuous))
    }

    private var symbol: String {
        switch notice.type {
        case "schedule":
            return "calendar"
        case "substitution":
            return "arrow.triangle.2.circlepath"
        case "formation":
            return "graduationcap"
        default:
            return "bell"
        }
    }
}

struct ScheduleMissionRow: View {
    let mission: ScheduleMission
    let mode: ScheduleMode
    var onConfirm: (() -> Void)?
    var onRequestSubstitution: (() -> Void)?

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            VStack(spacing: 4) {
                Text(mission.time)
                    .font(.system(size: 14, weight: .bold, design: .rounded))
                    .foregroundStyle(MESCColor.accent)
                Image(systemName: mission.isCurrentUser ? "person.crop.circle.badge.checkmark" : "calendar")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(mission.isCurrentUser ? MESCColor.gold : MESCColor.textSecondary)
            }
            .frame(width: 54)

            VStack(alignment: .leading, spacing: 8) {
                HStack(alignment: .firstTextBaseline, spacing: 8) {
                    Text(mission.title)
                        .font(MESCFont.cardTitle)
                        .foregroundStyle(MESCColor.textPrimary)
                    Spacer()
                    Text(mission.community)
                        .font(MESCFont.caption2)
                        .foregroundStyle(MESCColor.textSecondary)
                        .lineLimit(1)
                }

                Text(mode == .full ? mission.ministers.joined(separator: " • ") : mission.role)
                    .font(MESCFont.body)
                    .foregroundStyle(MESCColor.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)

                if mission.isCurrentUser {
                    Label(confirmationLabel, systemImage: confirmationSymbol)
                        .font(MESCFont.caption)
                        .foregroundStyle(confirmationTint)

                    if onConfirm != nil || onRequestSubstitution != nil {
                        HStack(spacing: 10) {
                            if let onConfirm {
                                MESCPrimaryButton(title: "Confirmar", symbol: "checkmark.circle", action: onConfirm)
                            }
                            if let onRequestSubstitution {
                                MESCSecondaryButton(title: "Trocar", symbol: "arrow.triangle.2.circlepath", action: onRequestSubstitution)
                            }
                        }
                    }
                }
            }
        }
        .padding(14)
        .mescGlass(cornerRadius: 18)
    }

    private var confirmationLabel: String {
        switch mission.confirmationStatus {
        case "confirmed":
            return "Presença confirmada"
        case "declined":
            return "Presença recusada"
        case "pending":
            return "Confirmação pendente"
        default:
            return mission.canConfirm ? "Aguardando confirmação" : "Sem ação pendente"
        }
    }

    private var confirmationSymbol: String {
        switch mission.confirmationStatus {
        case "confirmed":
            return "checkmark.seal.fill"
        case "declined":
            return "xmark.circle"
        default:
            return "clock"
        }
    }

    private var confirmationTint: Color {
        switch mission.confirmationStatus {
        case "confirmed":
            return MESCColor.accent
        case "declined":
            return MESCColor.primaryWine
        default:
            return MESCColor.gold
        }
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
        .mescGlass(cornerRadius: 18)
    }
}

struct NativePermissionRow: View {
    let title: String
    let detail: String
    let status: String
    let symbol: String
    let isEnabled: Bool
    let actionTitle: String
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

                VStack(alignment: .trailing, spacing: 6) {
                    Image(systemName: isEnabled ? "checkmark.circle.fill" : "chevron.right")
                        .font(.system(size: 20, weight: .semibold))
                        .foregroundStyle(isEnabled ? MESCColor.gold : MESCColor.textSecondary)

                    Text(actionTitle)
                        .font(MESCFont.caption2.weight(.semibold))
                        .foregroundStyle(isEnabled ? MESCColor.gold : MESCColor.accent)
                        .lineLimit(1)
                        .minimumScaleFactor(0.78)
                }
            }
            .padding(12)
            .mescGlass(cornerRadius: 18)
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
        ZStack {
            LinearGradient(
                colors: [
                    MESCColor.background,
                    MESCColor.background,
                    MESCColor.ivoryWarm
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )

            LinearGradient(
                colors: [
                    Color.white.opacity(0.18),
                    MESCColor.gold.opacity(0.055),
                    Color.clear
                ],
                startPoint: .topLeading,
                endPoint: .center
            )

            LinearGradient(
                colors: [
                    Color.clear,
                    MESCColor.primaryWine.opacity(0.035),
                    MESCColor.gold.opacity(0.045)
                ],
                startPoint: .top,
                endPoint: .bottomTrailing
            )
        }
        .ignoresSafeArea()
    }
}

enum MESCGlassIntensity {
    case panel
    case floating

    var tint: Color {
        switch self {
        case .panel:
            return MESCColor.glassTint
        case .floating:
            return MESCColor.glassFloatingTint
        }
    }

    var base: Color {
        switch self {
        case .panel:
            return MESCColor.glassBase
        case .floating:
            return MESCColor.glassFloatingBase
        }
    }

    var material: Material {
        switch self {
        case .panel:
            return .ultraThinMaterial
        case .floating:
            return .thinMaterial
        }
    }

    var shadowOpacity: Double {
        switch self {
        case .panel:
            return 0.13
        case .floating:
            return 0.20
        }
    }

    var highlightOpacity: Double {
        switch self {
        case .panel:
            return 0.22
        case .floating:
            return 0.30
        }
    }
}

extension View {
    @ViewBuilder
    func mescGlass(cornerRadius: CGFloat, intensity: MESCGlassIntensity = .panel) -> some View {
        if #available(iOS 26.0, *) {
            GlassEffectContainer(spacing: 10) {
                self
                    .background(intensity.material, in: RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
                    .background(intensity.base, in: RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
                    .glassEffect(
                        .regular
                            .tint(intensity.tint)
                            .interactive(),
                        in: RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    )
                    .overlay(glassRefraction(cornerRadius: cornerRadius, opacity: intensity.highlightOpacity))
                    .overlay(glassBorder(cornerRadius: cornerRadius))
                    .shadow(color: MESCColor.primaryWine.opacity(intensity.shadowOpacity), radius: intensity == .floating ? 30 : 24, x: 0, y: intensity == .floating ? 12 : 10)
                    .shadow(color: Color.white.opacity(intensity == .floating ? 0.28 : 0.18), radius: 1, x: -0.5, y: -0.5)
            }
        } else {
            self
                .background(intensity.material, in: RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
                .background(intensity.base, in: RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
                .overlay(glassRefraction(cornerRadius: cornerRadius, opacity: intensity.highlightOpacity))
                .overlay(glassBorder(cornerRadius: cornerRadius))
                .shadow(color: MESCColor.primaryWine.opacity(intensity.shadowOpacity * 0.82), radius: intensity == .floating ? 26 : 20, x: 0, y: intensity == .floating ? 10 : 8)
                .shadow(color: Color.white.opacity(intensity == .floating ? 0.24 : 0.14), radius: 1, x: -0.5, y: -0.5)
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

    private func glassRefraction(cornerRadius: CGFloat, opacity: Double) -> some View {
        let shape = RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)

        return ZStack {
            shape
                .fill(
                    LinearGradient(
                        colors: [
                            Color.white.opacity(opacity),
                            Color.white.opacity(opacity * 0.18),
                            MESCColor.gold.opacity(opacity * 0.34),
                            Color.clear
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )

            shape
                .stroke(Color.white.opacity(opacity * 0.70), lineWidth: 0.7)
                .blur(radius: 0.6)
                .offset(x: -0.5, y: -0.5)
                .mask(shape)

            shape
                .stroke(MESCColor.primaryWine.opacity(opacity * 0.28), lineWidth: 1)
                .blur(radius: 1.4)
                .offset(x: 1.2, y: 1.2)
                .mask(shape)
        }
        .allowsHitTesting(false)
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
    static let glassFloatingBase = dynamic(light: 0xFFFFFF, dark: 0x1C1C1E, lightAlpha: 0.18, darkAlpha: 0.24)
    static let glassFloatingTint = dynamic(light: 0xFFFFFF, dark: 0xEDEDED, lightAlpha: 0.12, darkAlpha: 0.07)
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

extension Collection {
    subscript(safe index: Index) -> Element? {
        indices.contains(index) ? self[index] : nil
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
    let pushProvider: String?
    let notificationPreferences: [String: JSONValue]?
    let biometricCapable: Bool?
    let biometricEnabled: Bool?
    let registered: Bool?
    let lastSeenAt: String?
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

struct MobileNotificationDTO: Codable, Identifiable {
    let id: String
    let type: String
    let eventKey: String?
    let title: String
    let message: String
    let priority: String?
    let read: Bool
    let readAt: String?
    let deepLink: String
    let createdAt: String?

    func withRead(read: Bool, readAt: String?) -> MobileNotificationDTO {
        MobileNotificationDTO(
            id: id,
            type: type,
            eventKey: eventKey,
            title: title,
            message: message,
            priority: priority,
            read: read,
            readAt: readAt,
            deepLink: deepLink,
            createdAt: createdAt
        )
    }
}

struct MobileNotificationsResponseDTO: Codable {
    let success: Bool
    let notifications: [MobileNotificationDTO]
    let unreadCount: Int
}

struct MobileNotificationReadDTO: Codable {
    let id: String
    let read: Bool
    let readAt: String?
}

struct MobileNotificationReadResponseDTO: Codable {
    let success: Bool
    let notification: MobileNotificationReadDTO
}

struct MobileNotificationReadAllResponseDTO: Codable {
    let success: Bool
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

struct MobileScheduleConfirmResponseDTO: Codable {
    let success: Bool
}

struct MobileSubstitutionCreateResponseDTO: Codable {
    let success: Bool
}

struct MobileSubstitutionUserDTO: Codable, Identifiable {
    let id: String
    let name: String
    let email: String
    let photoUrl: String?
}

struct MobileSubstitutionScheduleDTO: Codable, Identifiable {
    let id: String
    let date: String
    let time: String
    let type: String
    let location: String?
    let deepLink: String
}

struct MobileSubstitutionDTO: Codable, Identifiable {
    let id: String
    let scheduleId: String
    let requesterId: String
    let substituteId: String?
    let status: String
    let reason: String?
    let urgency: String
    let responseMessage: String?
    let schedule: MobileSubstitutionScheduleDTO
    let requester: MobileSubstitutionUserDTO?
    let substitute: MobileSubstitutionUserDTO?
    let deepLink: String
    let createdAt: String?
    let updatedAt: String?
}

struct MobileSubstitutionsResponseDTO: Codable {
    let success: Bool
    let substitutions: [MobileSubstitutionDTO]
}

struct MobileSubstitutionClaimResponseDTO: Codable {
    let success: Bool
    let substitution: MobileSubstitutionDTO
}

struct MobileProfileResponseDTO: Codable {
    let success: Bool
    let profile: MobileProfileDTO
}

struct MobileProfilePhotoResponseDTO: Codable {
    let success: Bool
    let photoUrl: String?
    let updatedAt: String
}

struct MobileProfileDTO: Codable, Identifiable {
    let id: String
    let email: String
    let name: String
    let phone: String?
    let whatsapp: String?
    let role: String
    let status: String
    let photoUrl: String?
    let homeCommunityId: String
    let scheduleDisplayName: String?
    let ministryStartDate: String?
    let maritalStatus: String?
    let preferredPosition: Int?
    let preferredPositions: [Int]
    let avoidPositions: [Int]
    let preferredTimes: [String]
    let availableForSpecialEvents: Bool
    let extraActivities: [String: JSONValue]
    let requiresPasswordChange: Bool
    let createdAt: String?
    let updatedAt: String?
}

struct MobileDeviceResponseDTO: Codable {
    let success: Bool
    let device: MobileDeviceDTO
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

struct MobileFormationAdminStudioResponseDTO: Codable {
    let success: Bool
    let community: MobileCommunityDTO
    let studio: MobileFormationAdminStudioDTO
}

struct MobileFormationAdminStudioDTO: Codable {
    let tracks: [MobileFormationAdminTrackDTO]
    let summary: MobileFormationAdminSummaryDTO
}

struct MobileFormationAdminSummaryDTO: Codable {
    let totalTracks: Int
    let totalModules: Int
    let totalLessons: Int
    let activeLessons: Int
    let videoLessons: Int
    let lastUpdated: String?
}

struct MobileFormationAdminTrackDTO: Codable, Identifiable {
    let id: String
    let title: String
    let description: String?
    let category: String?
    let orderIndex: Int
    let icon: String?
    let isActive: Bool
    let modules: [MobileFormationAdminModuleDTO]
}

struct MobileFormationAdminModuleDTO: Codable, Identifiable {
    let id: String
    let trackId: String
    let title: String
    let description: String?
    let orderIndex: Int
    let durationMinutes: Int?
    let videoUrl: String?
    let lessons: [MobileFormationAdminLessonDTO]
}

struct MobileFormationAdminLessonDTO: Codable, Identifiable {
    let id: String
    let moduleId: String
    let trackId: String?
    let title: String
    let description: String?
    let orderIndex: Int
    let lessonNumber: Int
    let estimatedDuration: Int?
    let isActive: Bool
    let videoUrl: String?
    let documentUrl: String?
    let sectionsCount: Int
    let updatedAt: String?
}

struct MobileFormationAdminLessonResponseDTO: Codable {
    let success: Bool
    let lesson: MobileFormationAdminLessonDTO
    let sections: [MobileFormationLessonSectionDTO]
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

    func completeFormationLessonSection(
        lessonId: String,
        sectionId: String,
        accessToken: String,
        communityId: String?,
        deviceId: String,
        idempotencyKey: String
    ) async throws -> MobileFormationLessonCompleteResponseDTO {
        try await authenticatedPost(
            "formation/lessons/\(lessonId)/sections/\(sectionId)/complete",
            accessToken: accessToken,
            communityId: communityId,
            deviceId: deviceId,
            idempotencyKey: idempotencyKey,
            body: EmptyRequestBody()
        )
    }

    func formationAdminStudio(
        accessToken: String,
        communityId: String?,
        deviceId: String
    ) async throws -> MobileFormationAdminStudioResponseDTO {
        try await get(
            "formation/admin/studio",
            accessToken: accessToken,
            communityId: communityId,
            deviceId: deviceId
        )
    }

    func createFormationAdminLesson(
        payload: FormationAdminLessonRequestBody,
        accessToken: String,
        communityId: String?,
        deviceId: String,
        idempotencyKey: String
    ) async throws -> MobileFormationAdminLessonResponseDTO {
        try await authenticatedPost(
            "formation/admin/lessons",
            accessToken: accessToken,
            communityId: communityId,
            deviceId: deviceId,
            idempotencyKey: idempotencyKey,
            body: payload
        )
    }

    func confirmSchedule(
        scheduleId: String,
        accessToken: String,
        communityId: String?,
        deviceId: String,
        idempotencyKey: String,
        status: String,
        notes: String?
    ) async throws -> MobileScheduleConfirmResponseDTO {
        try await authenticatedPost(
            "schedules/\(scheduleId)/confirm",
            accessToken: accessToken,
            communityId: communityId,
            deviceId: deviceId,
            idempotencyKey: idempotencyKey,
            body: ScheduleConfirmRequestBody(status: status, notes: notes)
        )
    }

    func requestSubstitution(
        scheduleId: String,
        accessToken: String,
        communityId: String?,
        deviceId: String,
        idempotencyKey: String,
        reason: String?
    ) async throws -> MobileSubstitutionCreateResponseDTO {
        try await authenticatedPost(
            "substitutions",
            accessToken: accessToken,
            communityId: communityId,
            deviceId: deviceId,
            idempotencyKey: idempotencyKey,
            body: SubstitutionCreateRequestBody(scheduleId: scheduleId, reason: reason)
        )
    }

    func substitutions(
        accessToken: String,
        communityId: String?,
        deviceId: String
    ) async throws -> MobileSubstitutionsResponseDTO {
        try await get(
            "substitutions",
            accessToken: accessToken,
            communityId: communityId,
            deviceId: deviceId
        )
    }

    func claimSubstitution(
        substitutionId: String,
        accessToken: String,
        communityId: String?,
        deviceId: String,
        idempotencyKey: String,
        message: String?
    ) async throws -> MobileSubstitutionClaimResponseDTO {
        try await authenticatedPost(
            "substitutions/\(substitutionId)/claim",
            accessToken: accessToken,
            communityId: communityId,
            deviceId: deviceId,
            idempotencyKey: idempotencyKey,
            body: SubstitutionClaimRequestBody(message: message)
        )
    }

    func profile(
        accessToken: String,
        communityId: String?,
        deviceId: String
    ) async throws -> MobileProfileResponseDTO {
        try await get(
            "profile",
            accessToken: accessToken,
            communityId: communityId,
            deviceId: deviceId
        )
    }

    func updateProfile(
        accessToken: String,
        communityId: String?,
        deviceId: String,
        idempotencyKey: String,
        body: ProfileUpdateRequestBody
    ) async throws -> MobileProfileResponseDTO {
        try await authenticatedPatch(
            "profile",
            accessToken: accessToken,
            communityId: communityId,
            deviceId: deviceId,
            idempotencyKey: idempotencyKey,
            body: body
        )
    }

    func profilePhoto(
        accessToken: String,
        communityId: String?,
        deviceId: String
    ) async throws -> Data {
        var request = try makeRequest(path: "profile/photo")
        request.httpMethod = "GET"
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        request.setValue(deviceId, forHTTPHeaderField: "X-Device-Id")
        if let communityId {
            request.setValue(communityId, forHTTPHeaderField: "X-Community-Id")
        }
        return try await sendData(request)
    }

    func uploadProfilePhoto(
        accessToken: String,
        communityId: String?,
        deviceId: String,
        idempotencyKey: String,
        imageBase64: String,
        contentType: String
    ) async throws -> MobileProfilePhotoResponseDTO {
        try await authenticatedPost(
            "profile/photo",
            accessToken: accessToken,
            communityId: communityId,
            deviceId: deviceId,
            idempotencyKey: idempotencyKey,
            body: ProfilePhotoUploadRequestBody(imageBase64: imageBase64, contentType: contentType)
        )
    }

    func removeProfilePhoto(
        accessToken: String,
        communityId: String?,
        deviceId: String,
        idempotencyKey: String
    ) async throws -> MobileProfilePhotoResponseDTO {
        try await authenticatedDelete(
            "profile/photo",
            accessToken: accessToken,
            communityId: communityId,
            deviceId: deviceId,
            idempotencyKey: idempotencyKey,
            body: EmptyRequestBody()
        )
    }

    func currentDevice(
        accessToken: String,
        communityId: String?,
        deviceId: String
    ) async throws -> MobileDeviceResponseDTO {
        try await get(
            "devices/current",
            accessToken: accessToken,
            communityId: communityId,
            deviceId: deviceId
        )
    }

    func notifications(
        accessToken: String,
        communityId: String?,
        deviceId: String,
        limit: Int
    ) async throws -> MobileNotificationsResponseDTO {
        try await get(
            "notifications",
            accessToken: accessToken,
            communityId: communityId,
            deviceId: deviceId,
            queryItems: [URLQueryItem(name: "limit", value: String(limit))]
        )
    }

    func markNotificationRead(
        notificationId: String,
        accessToken: String,
        communityId: String?,
        deviceId: String
    ) async throws -> MobileNotificationReadResponseDTO {
        try await authenticatedPatch(
            "notifications/\(notificationId)/read",
            accessToken: accessToken,
            communityId: communityId,
            deviceId: deviceId
        )
    }

    func markAllNotificationsRead(
        accessToken: String,
        communityId: String?,
        deviceId: String
    ) async throws -> MobileNotificationReadAllResponseDTO {
        try await authenticatedPatch(
            "notifications/read-all",
            accessToken: accessToken,
            communityId: communityId,
            deviceId: deviceId
        )
    }

    func updateCurrentDevice(
        accessToken: String,
        communityId: String?,
        deviceId: String,
        appVersion: String?,
        pushToken: String?,
        pushProvider: String?,
        pushEnabled: Bool?,
        biometricCapable: Bool?,
        biometricEnabled: Bool?,
        notificationPreferences: [String: Bool]?
    ) async throws -> MobileDeviceResponseDTO {
        try await authenticatedPut(
            "devices/current",
            accessToken: accessToken,
            communityId: communityId,
            deviceId: deviceId,
            body: DeviceUpdateRequestBody(
                deviceId: deviceId,
                platform: "ios",
                appVersion: appVersion,
                pushToken: pushToken,
                pushProvider: pushProvider,
                pushEnabled: pushEnabled,
                biometricCapable: biometricCapable,
                biometricEnabled: biometricEnabled,
                notificationPreferences: notificationPreferences
            )
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

    private func authenticatedPut<Response: Decodable, Body: Encodable>(
        _ path: String,
        accessToken: String,
        communityId: String?,
        deviceId: String,
        body: Body
    ) async throws -> Response {
        var request = try makeRequest(path: path)
        request.httpMethod = "PUT"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        request.setValue(deviceId, forHTTPHeaderField: "X-Device-Id")
        if let communityId {
            request.setValue(communityId, forHTTPHeaderField: "X-Community-Id")
        }
        request.httpBody = try encoder.encode(body)
        return try await send(request)
    }

    private func authenticatedPatch<Response: Decodable>(
        _ path: String,
        accessToken: String,
        communityId: String?,
        deviceId: String
    ) async throws -> Response {
        var request = try makeRequest(path: path)
        request.httpMethod = "PATCH"
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        request.setValue(deviceId, forHTTPHeaderField: "X-Device-Id")
        if let communityId {
            request.setValue(communityId, forHTTPHeaderField: "X-Community-Id")
        }
        return try await send(request)
    }

    private func authenticatedPatch<Response: Decodable, Body: Encodable>(
        _ path: String,
        accessToken: String,
        communityId: String?,
        deviceId: String,
        idempotencyKey: String,
        body: Body
    ) async throws -> Response {
        var request = try makeRequest(path: path)
        request.httpMethod = "PATCH"
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

    private func authenticatedDelete<Response: Decodable, Body: Encodable>(
        _ path: String,
        accessToken: String,
        communityId: String?,
        deviceId: String,
        idempotencyKey: String,
        body: Body
    ) async throws -> Response {
        var request = try makeRequest(path: path)
        request.httpMethod = "DELETE"
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

    private func sendData(_ request: URLRequest) async throws -> Data {
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

            return data
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

private struct ScheduleConfirmRequestBody: Encodable {
    let status: String
    let notes: String?
}

private struct SubstitutionCreateRequestBody: Encodable {
    let scheduleId: String
    let reason: String?
}

private struct SubstitutionClaimRequestBody: Encodable {
    let message: String?
}

struct ProfileUpdateRequestBody: Encodable {
    let name: String
    let phone: String?
    let whatsapp: String?
    let scheduleDisplayName: String?
    let ministryStartDate: String?
    let maritalStatus: String?
}

struct ProfilePhotoUploadRequestBody: Encodable {
    let imageBase64: String
    let contentType: String
}

struct FormationAdminLessonRequestBody: Encodable {
    let moduleId: String
    let title: String
    let description: String?
    let lessonNumber: Int?
    let durationMinutes: Int?
    let isActive: Bool?
    let sectionTitle: String?
    let sectionContent: String?
    let videoUrl: String?
}

private struct DeviceUpdateRequestBody: Encodable {
    let deviceId: String
    let platform: String
    let appVersion: String?
    let pushToken: String?
    let pushProvider: String?
    let pushEnabled: Bool?
    let biometricCapable: Bool?
    let biometricEnabled: Bool?
    let notificationPreferences: [String: Bool]?
}

private struct EmptyRequestBody: Encodable {}

final class MESCNativeSessionStore {
    private enum DefaultsKey {
        static let deviceId = "mesc.native.deviceId"
        static let activeCommunityId = "mesc.native.activeCommunityId"
        static let remotePushToken = "mesc.native.remotePushToken"
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

    var remotePushToken: String? {
        get { defaults.string(forKey: DefaultsKey.remotePushToken) }
        set {
            if let newValue, !newValue.isEmpty {
                defaults.set(newValue, forKey: DefaultsKey.remotePushToken)
            } else {
                defaults.removeObject(forKey: DefaultsKey.remotePushToken)
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
    let id: String
    let scheduleId: String?
    let dayNumber: Int
    let time: String
    let title: String
    let community: String
    let role: String
    let ministers: [String]
    let confirmationStatus: String?
    let canConfirm: Bool
    let canRequestSubstitution: Bool
    let isCurrentUser: Bool
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
                    id: "fixture-5-0800",
                    scheduleId: nil,
                    dayNumber: day,
                    time: "08:00",
                    title: "Missa Dominical",
                    community: "Santuário",
                    role: "P1: Auxiliar 1",
                    ministers: ["Ana Maria", "Carlos Roberto", "Fatima Lima", "Jose Paulo"],
                    confirmationStatus: nil,
                    canConfirm: false,
                    canRequestSubstitution: false,
                    isCurrentUser: false
                ),
                ScheduleMission(
                    id: "fixture-5-1800",
                    scheduleId: nil,
                    dayNumber: day,
                    time: "18:00",
                    title: "Missa da Noite",
                    community: "Santuário",
                    role: "Reserva",
                    ministers: ["Marina Costa", "Paulo Sergio", "Ana Maria"],
                    confirmationStatus: nil,
                    canConfirm: false,
                    canRequestSubstitution: false,
                    isCurrentUser: false
                )
            ]
        case 12:
            return [
                ScheduleMission(
                    id: "fixture-12-1000",
                    scheduleId: nil,
                    dayNumber: day,
                    time: "10:00",
                    title: "Missa da Comunidade",
                    community: "São Judas",
                    role: "P2: Patena",
                    ministers: ["Ana Maria", "Lucia Helena", "Roberto Alves"],
                    confirmationStatus: nil,
                    canConfirm: false,
                    canRequestSubstitution: false,
                    isCurrentUser: false
                )
            ]
        case 19:
            return [
                ScheduleMission(
                    id: "fixture-19-0800",
                    scheduleId: nil,
                    dayNumber: day,
                    time: "08:00",
                    title: "Missa Dominical",
                    community: "Santuário",
                    role: "P1: Auxiliar 2",
                    ministers: ["Ana Maria", "Beatriz Souza", "Miguel Rocha", "Clara Dias"],
                    confirmationStatus: nil,
                    canConfirm: false,
                    canRequestSubstitution: false,
                    isCurrentUser: false
                )
            ]
        case 26:
            return [
                ScheduleMission(
                    id: "fixture-26-1930",
                    scheduleId: nil,
                    dayNumber: day,
                    time: "19:30",
                    title: "Missa Votiva",
                    community: "Santuário",
                    role: "P3: Apoio",
                    ministers: ["Ana Maria", "Ricardo Nunes", "Helena Prado"],
                    confirmationStatus: nil,
                    canConfirm: false,
                    canRequestSubstitution: false,
                    isCurrentUser: false
                )
            ]
        default:
            return []
        }
    }
}
