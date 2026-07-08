import Foundation
import LocalAuthentication
import Security
import SwiftUI
import UIKit
import UserNotifications

extension Notification.Name {
    static let mescRemoteNotificationDeviceToken = Notification.Name("MESCRemoteNotificationDeviceToken")
    static let mescRemoteNotificationRegistrationFailed = Notification.Name("MESCRemoteNotificationRegistrationFailed")
}

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
    @Published var scheduleActionMessage: String?
    @Published var isMutatingSchedule = false
    @Published var isUsingFallbackData = false
    @Published var pushAuthorizationStatus: UNAuthorizationStatus = .notDetermined
    @Published var pushPermissionMessage: String?
    @Published var currentDevice: MobileDeviceDTO?
    @Published var notificationPreferences = MESCNotificationPreference.defaults
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
        return role == "gestor" || role == "coordenador"
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
        activeCommunity = nil
        missionHome = nil
        scheduleMonth = nil
        questionnaireCurrent = nil
        formationOverview = nil
        formationLessonDetail = nil
        questionnaireMessage = nil
        formationMessage = nil
        scheduleActionMessage = nil
        settingsMessage = nil
        currentDevice = nil
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
        await mutateSchedule(messageOnSuccess: "Pedido de substituição publicado.") { accessToken in
            _ = try await self.client.requestSubstitution(
                scheduleId: scheduleId,
                accessToken: accessToken,
                communityId: self.sessionStore.activeCommunityId,
                deviceId: self.sessionStore.deviceId,
                idempotencyKey: UUID().uuidString,
                reason: reason
            )
        }
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

        do {
            try await loadCurrentDevice(accessToken: accessToken)
            await syncStoredRemotePushTokenIfNeeded()
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
        .tint(MESCColor.primaryRed)
    }

    private var authenticatedShell: some View {
        ZStack {
            MESCBackground()

            currentScreen
        }
        .safeAreaInset(edge: .bottom, spacing: 0) {
            MESCGlassTabBar(selectedTab: $selectedTab)
                .padding(.horizontal, 14)
                .padding(.top, 6)
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
                                .fill(MESCColor.gold.opacity(0.13))
                                .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 18, style: .continuous)
                                        .fill(
                                            LinearGradient(
                                                colors: [
                                                    Color.white.opacity(0.26),
                                                    Color.white.opacity(0.05),
                                                    MESCColor.gold.opacity(0.10)
                                                ],
                                                startPoint: .topLeading,
                                                endPoint: .bottomTrailing
                                            )
                                        )
                                )
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
        .mescGlass(cornerRadius: 28, intensity: .floating)
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
    @State private var substitutionTarget: SubstitutionTarget?
    @State private var shareFile: ShareFile?

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
                        ScheduleMissionRow(
                            mission: mission,
                            mode: mode,
                            onConfirm: mission.canConfirm && mission.scheduleId != nil ? {
                                Task { await appModel.confirmSchedule(scheduleId: mission.scheduleId ?? mission.id) }
                            } : nil,
                            onRequestSubstitution: mission.canRequestSubstitution && mission.scheduleId != nil ? {
                                substitutionTarget = SubstitutionTarget(
                                    id: mission.id,
                                    scheduleId: mission.scheduleId ?? mission.id,
                                    title: "\(selectedDay.formattedTitle) às \(mission.time)",
                                    subtitle: "\(mission.title) - \(mission.community)"
                                )
                            } : nil
                        )
                    }
                }

                if let message = appModel.scheduleActionMessage {
                    Label(message, systemImage: message.contains("sucesso") || message.contains("publicado") ? "checkmark.seal" : "info.circle")
                        .font(MESCFont.caption)
                        .foregroundStyle(message.contains("sucesso") || message.contains("publicado") ? MESCColor.accent : MESCColor.primaryWine)
                        .fixedSize(horizontal: false, vertical: true)
                }

                MESCSecondaryButton(title: "Exportar lista no modelo oficial", symbol: "square.and.arrow.up") {
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
        .sheet(item: $shareFile) { file in
            ActivityView(activityItems: [file.url])
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
    @Environment(\.openURL) private var openURL
    @State private var isLessonPresented = false
    @State private var isVideoLibraryPresented = false

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

            GlassPanel(spacing: 14) {
                SectionTitle(title: "Biblioteca de vídeos", symbol: "play.rectangle")
                Text(videoLibraryDescription)
                    .font(MESCFont.body)
                    .foregroundStyle(MESCColor.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
                MESCSecondaryButton(title: "Ver vídeos", symbol: "video") {
                    isVideoLibraryPresented = true
                }
            }

            if appModel.canManageFormation {
                GlassPanel(spacing: 14) {
                    SectionTitle(title: "Área do coordenador", symbol: "plus.rectangle.on.folder")
                    Text("A autoria completa de aulas ainda está no painel de formação atual. O app nativo já consome trilhas, aulas, vídeos e progresso; o próximo contrato é trazer criação/edição para `/api/mobile/v1`.")
                        .font(MESCFont.body)
                        .foregroundStyle(MESCColor.textSecondary)
                        .fixedSize(horizontal: false, vertical: true)
                    MESCPrimaryButton(title: "Abrir estúdio de formação", symbol: "square.and.pencil") {
                        if let url = URL(string: "https://saojudastadeu.app/formation-admin") {
                            openURL(url)
                        }
                    }
                }
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
    }

    private var videoLibraryDescription: String {
        let count = appModel.formationVideoLessons.count
        if count == 0 {
            return "Nenhum vídeo publicado nas aulas carregadas até agora."
        }
        return count == 1 ? "1 aula com vídeo disponível." : "\(count) aulas com vídeo disponíveis."
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

            if mission.isCurrentUser {
                HStack(spacing: 8) {
                    Label(confirmationLabel, systemImage: confirmationSymbol)
                        .font(MESCFont.caption)
                        .foregroundStyle(confirmationTint)
                    Spacer()
                }

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
        .padding(14)
        .background(MESCColor.surface.opacity(0.72), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(MESCColor.gold.opacity(0.14), lineWidth: 1)
        )
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

private struct ScheduleConfirmRequestBody: Encodable {
    let status: String
    let notes: String?
}

private struct SubstitutionCreateRequestBody: Encodable {
    let scheduleId: String
    let reason: String?
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
