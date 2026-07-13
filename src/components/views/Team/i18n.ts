/**
 * Minimal local i18n for the Team view (en/ru/de), keyed on the admin
 * language (req.i18n.language server-side, passed down as a prop).
 * White-label copy only — brand is "AACSearch"; never name any vendor.
 */
const dict = {
  colEmail: { de: 'E-Mail', en: 'Email', ru: 'Эл. почта' },
  colJoined: { de: 'Beigetreten', en: 'Joined', ru: 'Присоединился' },
  colRole: { de: 'Rolle', en: 'Role', ru: 'Роль' },
  intro: {
    de: 'Mitglieder mit Zugriff auf diesen AACSearch-Arbeitsbereich.',
    en: 'People with access to this AACSearch workspace.',
    ru: 'Участники с доступом к этому рабочему пространству AACSearch.',
  },
  inviteEmail: { de: 'E-Mail des Mitglieds', en: 'Member email', ru: 'Эл. почта участника' },
  inviteError: {
    de: 'Einladung fehlgeschlagen. Bitte erneut versuchen.',
    en: 'Invite failed. Please try again.',
    ru: 'Не удалось пригласить. Попробуйте ещё раз.',
  },
  inviteExists: {
    de: 'Diese Person ist bereits Mitglied.',
    en: 'That person is already a member.',
    ru: 'Этот человек уже участник.',
  },
  inviteSend: { de: 'Einladen', en: 'Invite', ru: 'Пригласить' },
  inviteSuccess: {
    de: 'Einladung gesendet — die Person erhält einen Link zum Festlegen des Passworts.',
    en: 'Invite sent — they will get a link to set their password.',
    ru: 'Приглашение отправлено — участник получит ссылку для установки пароля.',
  },
  inviteTitle: { de: 'Mitglied einladen', en: 'Invite a member', ru: 'Пригласить участника' },
  membersEmpty: {
    de: 'In diesem Arbeitsbereich gibt es noch keine Mitglieder.',
    en: 'No members in this workspace yet.',
    ru: 'В этом рабочем пространстве пока нет участников.',
  },
  membersTitle: { de: 'Mitglieder', en: 'Members', ru: 'Участники' },
  noTenant: {
    de: 'Sie gehören noch keinem Arbeitsbereich an.',
    en: 'You are not a member of any workspace yet.',
    ru: 'Вы пока не состоите ни в одном рабочем пространстве.',
  },
  roleAdmin: { de: 'Administrator', en: 'Admin', ru: 'Администратор' },
  roleViewer: { de: 'Betrachter', en: 'Viewer', ru: 'Наблюдатель' },
  title: { de: 'Team', en: 'Team', ru: 'Команда' },
  workspace: { de: 'Arbeitsbereich', en: 'Workspace', ru: 'Рабочее пространство' },
} as const

export type TeamMessageKey = keyof typeof dict

const isRu = (lang: string): boolean => lang.toLowerCase().startsWith('ru')
const isDe = (lang: string): boolean => lang.toLowerCase().startsWith('de')

export const t = (lang: string, key: TeamMessageKey): string => {
  const entry = dict[key]
  if (isRu(lang)) return entry.ru
  if (isDe(lang)) return entry.de
  return entry.en
}
