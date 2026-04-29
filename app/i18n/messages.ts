import type { Locale } from "./config";
import {
	DEFAULT_SITE_CONFIG,
	type SiteConfig,
	replaceSiteTextDeep,
} from "~/utils/site-config";

export interface Dictionary {
	home: {
		title: string;
		description: string;
		keywords: string;
		heroTag: string;
		heroTitle: string;
		heroDescription: string;
		loadingAddresses: string;
		currentAddress: string;
		copy: string;
		copied: string;
		deleteAddress: string;
		deleting: string;
		generateNew: string;
		generating: string;
		noAddressTitle: string;
		noAddressDescription: string;
		generateAddress: string;
		customPrefixLabel: string;
		customPrefixPlaceholder: string;
		customPrefixHint: string;
		customPrefixAction: string;
		customPrefixError: string;
		stats: {
			lifetimeValue: string;
			refreshValue: string;
			registrationValue: string;
			lifetime: string;
			refresh: string;
			registration: string;
		};
		inboxTag: string;
		inboxTitle: string;
		loadingEmails: string;
		emptyInboxTitle: string;
		emptyInboxDescription: string;
		refreshInbox: string;
		refreshingInbox: string;
		lastRefresh: string;
		safetyHint: string;
		modal: {
			title: string;
			from: string;
			time: string;
			loading: string;
			empty: string;
		};
	};
	layout: {
		siteSubtitle: string;
		nav: {
			home: string;
			about: string;
			faq: string;
		};
		footerTag: string;
		footerDescription: string;
		footerLinks: {
			faq: string;
			privacy: string;
			terms: string;
			about: string;
		};
		copyright: string;
		themeToLight: string;
		themeToDark: string;
	};
}

const en: Dictionary = {
	home: {
		title: "smail.pw Temporary Email - Free 24h Inbox for OTP",
		description:
			"Create a free 24-hour temporary inbox for sign-ups and OTP codes. No account required; messages are removed after 24 hours.",
		keywords:
			"smail, smail temp mail, temporary email, temp mail, disposable email, temporary email generator, 24 hour temporary email, no registration email, otp email, smail.pw",
		heroTag: "Temporary inbox",
		heroTitle: "Create a 24-hour email address in one tap.",
		heroDescription:
			"Use it for sign-ups, OTP codes, and one-off messages. Mail is removed after 24 hours.",
		loadingAddresses: "Loading address...",
		currentAddress: "Current temporary email",
		copy: "Copy",
		copied: "Copied",
		deleteAddress: "Delete address",
		deleting: "Deleting...",
		generateNew: "Generate new",
		generating: "Generating...",
		noAddressTitle: "No address yet",
		noAddressDescription:
			"Create a temporary address for sign-ups and one-time verification.",
		generateAddress: "Generate address",
		customPrefixLabel: "Custom prefix",
		customPrefixPlaceholder: "Enter a previous prefix",
		customPrefixHint:
			"Use 3-32 lowercase letters, numbers, or single hyphens only.",
		customPrefixAction: "Reuse address",
		customPrefixError:
			"Use 3-32 lowercase letters, numbers, or single hyphens only.",
		stats: {
			lifetimeValue: "24h",
			refreshValue: "Instant",
			registrationValue: "None",
			lifetime: "Email retention",
			refresh: "Inbox refresh",
			registration: "Sign-up",
		},
		inboxTag: "Inbox",
		inboxTitle: "Latest emails",
		loadingEmails: "Loading emails...",
		emptyInboxTitle: "Waiting for mail",
		emptyInboxDescription:
			"No messages yet. New mail will appear here.",
		refreshInbox: "Refresh",
		refreshingInbox: "Refreshing...",
		lastRefresh: "Last refresh",
		safetyHint:
			"Do not use this address for banking, work, or important accounts. Mail is removed after 24 hours.",
		modal: {
			title: "Message preview",
			from: "From",
			time: "Time",
			loading: "Loading...",
			empty: "No content",
		},
	},
	layout: {
		siteSubtitle: "temporary inbox",
		nav: {
			home: "Home",
			about: "About",
			faq: "FAQ",
		},
		footerTag: "privacy-first utilities",
		footerDescription:
			"A temporary inbox for verification, testing, and short-lived mail without exposing your personal address.",
		footerLinks: {
			faq: "FAQ",
			privacy: "Privacy Policy",
			terms: "Terms of Use",
			about: "About smail.pw",
		},
		copyright: "Temporary mail, less exposure.",
		themeToLight: "Light",
		themeToDark: "Dark",
	},
};

const zh: Dictionary = {
	home: {
		title: "临时邮箱生成器 - 免费 24 小时收验证码邮箱 | smail.pw",
		description:
			"免费创建 24 小时临时邮箱，用于注册、收验证码和一次性收信。无需账号，邮件 24 小时后自动删除。",
		keywords:
			"临时邮箱, 一次性邮箱, 临时邮箱生成器, 免费临时邮箱, 24小时临时邮箱, 24小时邮箱, 验证码邮箱, 免注册临时邮箱, 在线临时邮箱, 国内临时邮箱, 临时邮箱注册, 邮箱生成器",
		heroTag: "一次性邮箱",
		heroTitle: "一键创建 24 小时临时邮箱。",
		heroDescription:
			"用于注册、收验证码和一次性收信。邮件 24 小时后自动删除。",
		loadingAddresses: "正在加载地址...",
		currentAddress: "当前临时邮箱",
		copy: "复制",
		copied: "已复制",
		deleteAddress: "删除地址",
		deleting: "删除中...",
		generateNew: "生成新地址",
		generating: "生成中...",
		noAddressTitle: "暂无地址",
		noAddressDescription: "生成一个临时邮箱，用于注册和一次性验证。",
		generateAddress: "生成地址",
		customPrefixLabel: "自定义前缀",
		customPrefixPlaceholder: "输入曾用前缀",
		customPrefixHint: "仅限 3-32 位小写字母、数字或单个连字符。",
		customPrefixAction: "复用地址",
		customPrefixError: "请输入 3-32 位小写字母、数字或单个连字符。",
		stats: {
			lifetimeValue: "24小时",
			refreshValue: "即时",
			registrationValue: "免注册",
			lifetime: "邮件保留",
			refresh: "收件箱刷新",
			registration: "无需注册",
		},
		inboxTag: "收件箱",
		inboxTitle: "最新邮件",
		loadingEmails: "正在加载邮件...",
		emptyInboxTitle: "等待来信",
		emptyInboxDescription: "暂无邮件，收到后会显示在这里。",
		refreshInbox: "刷新",
		refreshingInbox: "刷新中...",
		lastRefresh: "最近刷新",
		safetyHint:
			"请勿用于银行、工作或重要账号。邮件会在 24 小时后自动删除。",
		modal: {
			title: "邮件预览",
			from: "发件人",
			time: "时间",
			loading: "加载中...",
			empty: "暂无内容",
		},
	},
	layout: {
		siteSubtitle: "临时收件箱",
		nav: {
			home: "首页",
			about: "关于",
			faq: "常见问题",
		},
		footerTag: "隐私优先工具",
		footerDescription:
			"用于验证、测试和短期收信，减少个人邮箱暴露。",
		footerLinks: {
			faq: "常见问题",
			privacy: "隐私政策",
			terms: "使用条款",
			about: "关于 smail.pw",
		},
		copyright: "临时收信，减少暴露。",
		themeToLight: "浅色",
		themeToDark: "深色",
	},
};

const es: Dictionary = {
	home: {
		title: "Correo temporal gratis 24h sin registro para OTP | smail.pw",
		description:
			"Generador de correo temporal gratis (temp mail) para registros y códigos OTP. Crea un buzón desechable de 24 horas al instante.",
		keywords:
			"correo temporal, correo temporal gratis, email temporal, email desechable, temp mail, 24 horas, sin registro, codigo otp, smail.pw",
		heroTag: "Buzón temporal",
		heroTitle: "Protege tu privacidad con un buzón en un clic.",
		heroDescription:
			"Genera una dirección temporal para registros y verificaciones, y elimínala cuando termines.",
		loadingAddresses: "Cargando direcciones...",
		currentAddress: "Dirección temporal actual",
		copy: "Copiar",
		copied: "Copiado",
		deleteAddress: "Eliminar dirección",
		deleting: "Eliminando...",
		generateNew: "Generar nueva",
		generating: "Generando...",
		noAddressTitle: "Aún no tienes correo temporal",
		noAddressDescription:
			"Genera una dirección temporal para registros y verificaciones rápidas.",
		generateAddress: "Generar dirección",
		customPrefixLabel: "Prefijo personalizado",
		customPrefixPlaceholder: "Reutiliza un prefijo anterior",
		customPrefixHint:
			"Usa 3-32 letras minúsculas, números o guiones simples.",
		customPrefixAction: "Reutilizar dirección",
		customPrefixError:
			"Usa 3-32 letras minúsculas, números o guiones simples.",
		stats: {
			lifetimeValue: "24h",
			refreshValue: "Instantáneo",
			registrationValue: "Cero",
			lifetime: "Vida útil",
			refresh: "Actualización",
			registration: "Registro",
		},
		inboxTag: "Bandeja",
		inboxTitle: "Últimos correos",
		loadingEmails: "Cargando correos...",
		emptyInboxTitle: "Tu bandeja te espera",
		emptyInboxDescription: "Aún no hay correos. Aparecerán aquí al instante.",
		refreshInbox: "Actualizar",
		refreshingInbox: "Actualizando...",
		lastRefresh: "Última actualización",
		safetyHint:
			"No uses esta dirección para banca, trabajo o códigos de cuentas importantes.",
		modal: {
			title: "Vista previa",
			from: "De",
			time: "Hora",
			loading: "Cargando...",
			empty: "Sin contenido",
		},
	},
	layout: {
		siteSubtitle: "buzón temporal",
		nav: { home: "Inicio", about: "Acerca de", faq: "FAQ" },
		footerTag: "utilidades centradas en privacidad",
		footerDescription:
			"Buzón desechable para verificaciones, pruebas y comunicaciones cortas sin exponer tu correo principal.",
		footerLinks: {
			faq: "FAQ",
			privacy: "Privacidad",
			terms: "Términos",
			about: "Sobre smail.pw",
		},
		copyright: "Bandeja limpia, identidad limpia.",
		themeToLight: "☀ Claro",
		themeToDark: "🌙 Oscuro",
	},
};

const fr: Dictionary = {
	home: {
		title: "Email temporaire gratuit 24h sans inscription | smail.pw",
		description:
			"Générateur d'email temporaire gratuit (temp mail) pour inscriptions rapides et codes OTP. Créez une boîte jetable 24h immédiatement.",
		keywords:
			"email temporaire, email jetable, temp mail, 24h, sans inscription, code otp, boite mail temporaire, smail.pw",
		heroTag: "Boîte temporaire",
		heroTitle: "Protégez votre vie privée en un clic.",
		heroDescription:
			"Créez une adresse temporaire pour les inscriptions et vérifications, puis supprimez-la quand c'est fini.",
		loadingAddresses: "Chargement des adresses...",
		currentAddress: "Adresse temporaire actuelle",
		copy: "Copier",
		copied: "Copié",
		deleteAddress: "Supprimer l'adresse",
		deleting: "Suppression...",
		generateNew: "Nouvelle adresse",
		generating: "Génération...",
		noAddressTitle: "Aucune adresse temporaire",
		noAddressDescription:
			"Générez une adresse temporaire pour inscriptions et vérifications.",
		generateAddress: "Générer une adresse",
		customPrefixLabel: "Préfixe personnalisé",
		customPrefixPlaceholder: "Réutiliser un ancien préfixe",
		customPrefixHint:
			"Utilisez 3-32 lettres minuscules, chiffres ou tirets simples.",
		customPrefixAction: "Reutiliser l'adresse",
		customPrefixError:
			"Utilisez 3-32 lettres minuscules, chiffres ou tirets simples.",
		stats: {
			lifetimeValue: "24h",
			refreshValue: "Instantané",
			registrationValue: "Zéro",
			lifetime: "Durée",
			refresh: "Rafraîchissement",
			registration: "Inscription",
		},
		inboxTag: "Boîte",
		inboxTitle: "Derniers emails",
		loadingEmails: "Chargement des emails...",
		emptyInboxTitle: "Votre boîte vous attend",
		emptyInboxDescription:
			"Aucun email pour l'instant. Ils apparaîtront ici immédiatement.",
		refreshInbox: "Rafraîchir",
		refreshingInbox: "Actualisation...",
		lastRefresh: "Dernière mise à jour",
		safetyHint:
			"N’utilisez pas cette adresse pour la banque, le travail ou des codes de comptes importants.",
		modal: {
			title: "Aperçu du message",
			from: "De",
			time: "Heure",
			loading: "Chargement...",
			empty: "Aucun contenu",
		},
	},
	layout: {
		siteSubtitle: "boîte temporaire",
		nav: { home: "Accueil", about: "À propos", faq: "FAQ" },
		footerTag: "outils orientés confidentialité",
		footerDescription:
			"Boîte jetable pour vérifications, tests et messages courts sans exposer votre boîte principale.",
		footerLinks: {
			faq: "FAQ",
			privacy: "Confidentialité",
			terms: "Conditions",
			about: "À propos de smail.pw",
		},
		copyright: "Boîte propre, identité propre.",
		themeToLight: "☀ Clair",
		themeToDark: "🌙 Sombre",
	},
};

const de: Dictionary = {
	home: {
		title: "Temporäre E-Mail kostenlos (24h) ohne Registrierung | smail.pw",
		description:
			"Kostenloser Temp-Mail-Generator für Registrierungen und OTP-Codes. Erstelle sofort ein 24h Wegwerf-Postfach ohne Konto.",
		keywords:
			"temporäre email, wegwerf-email, temp mail, 24h email, ohne registrierung, otp code email, smail.pw",
		heroTag: "Temporäres Postfach",
		heroTitle: "Schütze deine Privatsphäre mit einem Klick.",
		heroDescription:
			"Erstelle eine temporäre Adresse für Registrierungen und Bestätigungen und lösche sie danach.",
		loadingAddresses: "Adressen werden geladen...",
		currentAddress: "Aktuelle Wegwerfadresse",
		copy: "Kopieren",
		copied: "Kopiert",
		deleteAddress: "Adresse löschen",
		deleting: "Wird gelöscht...",
		generateNew: "Neu generieren",
		generating: "Wird generiert...",
		noAddressTitle: "Noch keine Wegwerfadresse",
		noAddressDescription:
			"Erzeuge eine temporäre Adresse für schnelle Registrierungen und Verifizierungen.",
		generateAddress: "Adresse erzeugen",
		customPrefixLabel: "Eigenes Präfix",
		customPrefixPlaceholder: "Ein früheres Präfix wiederverwenden",
		customPrefixHint:
			"Verwende 3-32 Kleinbuchstaben, Ziffern oder einzelne Bindestriche.",
		customPrefixAction: "Adresse wiederverwenden",
		customPrefixError:
			"Verwende 3-32 Kleinbuchstaben, Ziffern oder einzelne Bindestriche.",
		stats: {
			lifetimeValue: "24h",
			refreshValue: "Sofort",
			registrationValue: "Null",
			lifetime: "Lebensdauer",
			refresh: "Aktualisierung",
			registration: "Registrierung",
		},
		inboxTag: "Posteingang",
		inboxTitle: "Neueste E-Mails",
		loadingEmails: "E-Mails werden geladen...",
		emptyInboxTitle: "Dein Posteingang wartet",
		emptyInboxDescription:
			"Noch keine E-Mails. Neue Nachrichten erscheinen sofort hier.",
		refreshInbox: "Aktualisieren",
		refreshingInbox: "Wird aktualisiert...",
		lastRefresh: "Zuletzt aktualisiert",
		safetyHint: "Nicht für Banking, Arbeit oder wichtige Kontocodes verwenden.",
		modal: {
			title: "Nachrichtenvorschau",
			from: "Von",
			time: "Zeit",
			loading: "Lädt...",
			empty: "Kein Inhalt",
		},
	},
	layout: {
		siteSubtitle: "temporäres Postfach",
		nav: { home: "Start", about: "Über", faq: "FAQ" },
		footerTag: "datenschutzorientierte tools",
		footerDescription:
			"Wegwerf-Postfach für Verifizierungen, Tests und kurze Kommunikation ohne dein Hauptpostfach preiszugeben.",
		footerLinks: {
			faq: "FAQ",
			privacy: "Datenschutz",
			terms: "Nutzungsbedingungen",
			about: "Über smail.pw",
		},
		copyright: "Sauberes Postfach, saubere Identität.",
		themeToLight: "☀ Hell",
		themeToDark: "🌙 Dunkel",
	},
};

const ja: Dictionary = {
	home: {
		title: "一時メール（24時間）無料・登録不要でOTP受信 | smail.pw",
		description:
			"無料の一時メール（temp mail）生成サービス。登録不要で24時間の使い捨て受信箱を作成し、認証コードを受け取れます。",
		keywords:
			"一時メール, 使い捨てメール, テンプメール, 24時間メール, 登録不要メール, OTP, 認証メール, smail.pw",
		heroTag: "一時メールボックス",
		heroTitle: "ワンクリックでプライバシーを保護。",
		heroDescription:
			"登録や認証用に一時アドレスを作成し、不要になったら削除できます。",
		loadingAddresses: "アドレスを読み込み中...",
		currentAddress: "現在の一時アドレス",
		copy: "コピー",
		copied: "コピー済み",
		deleteAddress: "アドレス削除",
		deleting: "削除中...",
		generateNew: "新規生成",
		generating: "生成中...",
		noAddressTitle: "一時メールがまだありません",
		noAddressDescription: "登録や認証のために一時アドレスを生成してください。",
		generateAddress: "アドレス生成",
		customPrefixLabel: "カスタム接頭辞",
		customPrefixPlaceholder: "再利用したい接頭辞を入力",
		customPrefixHint:
			"3〜32文字の小文字、数字、単一ハイフンのみ使えます。",
		customPrefixAction: "アドレスを再利用",
		customPrefixError:
			"3〜32文字の小文字、数字、単一ハイフンを入力してください。",
		stats: {
			lifetimeValue: "24時間",
			refreshValue: "即時",
			registrationValue: "不要",
			lifetime: "有効期間",
			refresh: "受信更新",
			registration: "登録",
		},
		inboxTag: "受信箱",
		inboxTitle: "最新メール",
		loadingEmails: "メールを読み込み中...",
		emptyInboxTitle: "受信箱は準備完了です",
		emptyInboxDescription:
			"まだメールはありません。届くとすぐここに表示されます。",
		refreshInbox: "更新",
		refreshingInbox: "更新中...",
		lastRefresh: "最終更新",
		safetyHint:
			"銀行・仕事・重要アカウントの認証コードには使用しないでください。",
		modal: {
			title: "メッセージプレビュー",
			from: "差出人",
			time: "時刻",
			loading: "読み込み中...",
			empty: "内容なし",
		},
	},
	layout: {
		siteSubtitle: "一時受信箱",
		nav: { home: "ホーム", about: "概要", faq: "FAQ" },
		footerTag: "プライバシー重視のツール",
		footerDescription:
			"主要メールを公開せず、認証・テスト・短期利用に使える使い捨て受信箱です。",
		footerLinks: {
			faq: "FAQ",
			privacy: "プライバシー",
			terms: "利用規約",
			about: "smail.pw について",
		},
		copyright: "受信箱をクリーンに、アイデンティティもクリーンに。",
		themeToLight: "☀ ライト",
		themeToDark: "🌙 ダーク",
	},
};

const ko: Dictionary = {
	home: {
		title: "임시 이메일 24시간 무료, 가입 없이 OTP 수신 | smail.pw",
		description:
			"무료 임시 이메일(temp mail) 생성기. 가입 없이 24시간 일회용 메일함을 만들고 인증 코드(OTP)를 빠르게 받으세요.",
		keywords:
			"임시 이메일, 일회용 이메일, 템프 메일, 24시간 메일, 가입 없는 이메일, OTP 메일, 인증 메일, smail.pw",
		heroTag: "임시 메일함",
		heroTitle: "한 번의 클릭으로 개인정보 보호.",
		heroDescription:
			"회원가입 및 인증용 임시 주소를 만들고, 사용 후 바로 삭제하세요.",
		loadingAddresses: "주소 불러오는 중...",
		currentAddress: "현재 임시 주소",
		copy: "복사",
		copied: "복사됨",
		deleteAddress: "주소 삭제",
		deleting: "삭제 중...",
		generateNew: "새로 생성",
		generating: "생성 중...",
		noAddressTitle: "아직 임시 이메일이 없습니다",
		noAddressDescription: "가입 및 인증에 사용할 임시 주소를 생성하세요.",
		generateAddress: "주소 생성",
		customPrefixLabel: "사용자 지정 접두사",
		customPrefixPlaceholder: "다시 쓸 접두사를 입력하세요",
		customPrefixHint:
			"3-32자의 소문자, 숫자, 단일 하이픈만 사용할 수 있습니다.",
		customPrefixAction: "주소 재사용",
		customPrefixError:
			"3-32자의 소문자, 숫자, 단일 하이픈만 입력하세요.",
		stats: {
			lifetimeValue: "24시간",
			refreshValue: "즉시",
			registrationValue: "없음",
			lifetime: "유효기간",
			refresh: "새로고침",
			registration: "가입",
		},
		inboxTag: "받은편지함",
		inboxTitle: "최신 메일",
		loadingEmails: "메일 불러오는 중...",
		emptyInboxTitle: "받은편지함이 준비되었습니다",
		emptyInboxDescription: "아직 메일이 없습니다. 도착하면 즉시 표시됩니다.",
		refreshInbox: "새로고침",
		refreshingInbox: "새로고침 중...",
		lastRefresh: "최근 새로고침",
		safetyHint: "은행·업무·중요 계정 인증코드에는 사용하지 마세요.",
		modal: {
			title: "메일 미리보기",
			from: "보낸사람",
			time: "시간",
			loading: "불러오는 중...",
			empty: "내용 없음",
		},
	},
	layout: {
		siteSubtitle: "임시 받은편지함",
		nav: { home: "홈", about: "소개", faq: "FAQ" },
		footerTag: "프라이버시 중심 도구",
		footerDescription:
			"주 이메일을 노출하지 않고 인증, 테스트, 단기 사용에 적합한 일회용 메일함입니다.",
		footerLinks: {
			faq: "FAQ",
			privacy: "개인정보",
			terms: "이용약관",
			about: "smail.pw 소개",
		},
		copyright: "깔끔한 메일함, 깔끔한 신원.",
		themeToLight: "☀ 라이트",
		themeToDark: "🌙 다크",
	},
};

const ru: Dictionary = {
	home: {
		title: "Временная почта 24 часа бесплатно без регистрации | smail.pw",
		description:
			"Бесплатный temp mail для регистраций и OTP-кодов. Создайте одноразовый почтовый ящик на 24 часа без аккаунта.",
		keywords:
			"временная почта, одноразовая почта, temp mail, почта 24 часа, без регистрации, otp код, smail.pw",
		heroTag: "Временный ящик",
		heroTitle: "Защитите приватность в один клик.",
		heroDescription:
			"Создайте временный адрес для регистраций и подтверждений, затем удалите его, когда закончите.",
		loadingAddresses: "Загрузка адресов...",
		currentAddress: "Текущий временный адрес",
		copy: "Копировать",
		copied: "Скопировано",
		deleteAddress: "Удалить адрес",
		deleting: "Удаление...",
		generateNew: "Создать новый",
		generating: "Создание...",
		noAddressTitle: "Пока нет временного адреса",
		noAddressDescription:
			"Создайте временный адрес для регистраций и разовых проверок.",
		generateAddress: "Создать адрес",
		customPrefixLabel: "Свой префикс",
		customPrefixPlaceholder: "Повторно использовать старый префикс",
		customPrefixHint:
			"Используйте 3-32 строчные буквы, цифры или одиночные дефисы.",
		customPrefixAction: "Переиспользовать адрес",
		customPrefixError:
			"Используйте 3-32 строчные буквы, цифры или одиночные дефисы.",
		stats: {
			lifetimeValue: "24ч",
			refreshValue: "Мгновенно",
			registrationValue: "Ноль",
			lifetime: "Срок",
			refresh: "Обновление",
			registration: "Регистрация",
		},
		inboxTag: "Входящие",
		inboxTitle: "Последние письма",
		loadingEmails: "Загрузка писем...",
		emptyInboxTitle: "Ваш ящик готов",
		emptyInboxDescription:
			"Писем пока нет. Новые сообщения появятся здесь мгновенно.",
		refreshInbox: "Обновить",
		refreshingInbox: "Обновление...",
		lastRefresh: "Последнее обновление",
		safetyHint:
			"Не используйте этот адрес для банковских, рабочих или важных кодов аккаунтов.",
		modal: {
			title: "Предпросмотр",
			from: "От",
			time: "Время",
			loading: "Загрузка...",
			empty: "Нет содержимого",
		},
	},
	layout: {
		siteSubtitle: "временный ящик",
		nav: { home: "Главная", about: "О сервисе", faq: "FAQ" },
		footerTag: "инструменты с фокусом на приватность",
		footerDescription:
			"Одноразовый ящик для подтверждений, тестов и коротких сообщений без раскрытия вашей основной почты.",
		footerLinks: {
			faq: "FAQ",
			privacy: "Конфиденциальность",
			terms: "Условия",
			about: "О smail.pw",
		},
		copyright: "Чистый ящик, чистая идентичность.",
		themeToLight: "☀ Светлая",
		themeToDark: "🌙 Тёмная",
	},
};

const pt: Dictionary = {
	home: {
		title: "Email temporário grátis 24h sem cadastro para OTP | smail.pw",
		description:
			"Gerador de temp mail grátis para cadastro e códigos OTP. Crie uma caixa descartável de 24h instantaneamente.",
		keywords:
			"email temporario, email temporário, email descartavel, temp mail, 24h, sem cadastro, codigo otp, smail.pw",
		heroTag: "Caixa temporária",
		heroTitle: "Proteja sua privacidade com um clique.",
		heroDescription:
			"Gere um endereço temporário para cadastros e verificações e exclua quando terminar.",
		loadingAddresses: "Carregando endereços...",
		currentAddress: "Endereço temporário atual",
		copy: "Copiar",
		copied: "Copiado",
		deleteAddress: "Excluir endereço",
		deleting: "Excluindo...",
		generateNew: "Gerar novo",
		generating: "Gerando...",
		noAddressTitle: "Ainda não há e-mail temporário",
		noAddressDescription:
			"Gere um endereço temporário para cadastros e verificações rápidas.",
		generateAddress: "Gerar endereço",
		customPrefixLabel: "Prefixo personalizado",
		customPrefixPlaceholder: "Reutilize um prefixo antigo",
		customPrefixHint:
			"Use 3-32 letras minúsculas, números ou hífens simples.",
		customPrefixAction: "Reutilizar endereço",
		customPrefixError:
			"Use 3-32 letras minúsculas, números ou hífens simples.",
		stats: {
			lifetimeValue: "24h",
			refreshValue: "Instantâneo",
			registrationValue: "Zero",
			lifetime: "Duração",
			refresh: "Atualização",
			registration: "Cadastro",
		},
		inboxTag: "Caixa de entrada",
		inboxTitle: "E-mails recentes",
		loadingEmails: "Carregando e-mails...",
		emptyInboxTitle: "Sua caixa está pronta",
		emptyInboxDescription:
			"Ainda não há e-mails. Eles aparecerão aqui instantaneamente.",
		refreshInbox: "Atualizar",
		refreshingInbox: "Atualizando...",
		lastRefresh: "Última atualização",
		safetyHint:
			"Não use este endereço para banco, trabalho ou códigos de contas importantes.",
		modal: {
			title: "Pré-visualização",
			from: "De",
			time: "Hora",
			loading: "Carregando...",
			empty: "Sem conteúdo",
		},
	},
	layout: {
		siteSubtitle: "caixa temporária",
		nav: { home: "Início", about: "Sobre", faq: "FAQ" },
		footerTag: "utilitários com foco em privacidade",
		footerDescription:
			"Caixa descartável para verificações, testes e comunicações curtas sem expor seu e-mail principal.",
		footerLinks: {
			faq: "FAQ",
			privacy: "Privacidade",
			terms: "Termos",
			about: "Sobre smail.pw",
		},
		copyright: "Caixa limpa, identidade limpa.",
		themeToLight: "☀ Claro",
		themeToDark: "🌙 Escuro",
	},
};

const ar: Dictionary = {
	home: {
		title: "بريد مؤقت مجاني 24 ساعة بدون تسجيل لاستلام OTP | smail.pw",
		description:
			"مولّد بريد مؤقت مجاني (temp mail) للتسجيل السريع ورموز OTP. أنشئ صندوقًا للاستخدام مرة واحدة لمدة 24 ساعة فورًا.",
		keywords:
			"بريد مؤقت, بريد مؤقت مجاني, بريد للاستخدام مرة واحدة, temp mail, بريد 24 ساعة, بدون تسجيل, رمز otp, smail.pw",
		heroTag: "صندوق مؤقت",
		heroTitle: "احمِ خصوصيتك بنقرة واحدة.",
		heroDescription:
			"أنشئ عنوانًا مؤقتًا للتسجيلات ورسائل التحقق ثم احذفه عند الانتهاء.",
		loadingAddresses: "جارٍ تحميل العناوين...",
		currentAddress: "العنوان المؤقت الحالي",
		copy: "نسخ",
		copied: "تم النسخ",
		deleteAddress: "حذف العنوان",
		deleting: "جارٍ الحذف...",
		generateNew: "إنشاء جديد",
		generating: "جارٍ الإنشاء...",
		noAddressTitle: "لا يوجد بريد مؤقت بعد",
		noAddressDescription: "أنشئ عنوانًا مؤقتًا للتسجيل والتحقق السريع.",
		generateAddress: "إنشاء عنوان",
		customPrefixLabel: "بادئة مخصصة",
		customPrefixPlaceholder: "أعد استخدام بادئة سابقة",
		customPrefixHint:
			"استخدم من 3 إلى 32 حرفًا صغيرًا أو رقمًا أو شرطات مفردة.",
		customPrefixAction: "إعادة استخدام العنوان",
		customPrefixError:
			"استخدم من 3 إلى 32 حرفًا صغيرًا أو رقمًا أو شرطات مفردة.",
		stats: {
			lifetimeValue: "24س",
			refreshValue: "فوري",
			registrationValue: "صفر",
			lifetime: "مدة الصلاحية",
			refresh: "التحديث",
			registration: "التسجيل",
		},
		inboxTag: "الوارد",
		inboxTitle: "أحدث الرسائل",
		loadingEmails: "جارٍ تحميل الرسائل...",
		emptyInboxTitle: "صندوقك بانتظارك",
		emptyInboxDescription: "لا توجد رسائل بعد. ستظهر هنا فور وصولها.",
		refreshInbox: "تحديث",
		refreshingInbox: "جارٍ التحديث...",
		lastRefresh: "آخر تحديث",
		safetyHint:
			"لا تستخدم هذا العنوان للبنوك أو العمل أو رموز الحسابات المهمة.",
		modal: {
			title: "معاينة الرسالة",
			from: "من",
			time: "الوقت",
			loading: "جارٍ التحميل...",
			empty: "لا يوجد محتوى",
		},
	},
	layout: {
		siteSubtitle: "صندوق مؤقت",
		nav: { home: "الرئيسية", about: "حول", faq: "الأسئلة الشائعة" },
		footerTag: "أدوات تركز على الخصوصية",
		footerDescription:
			"صندوق بريد مؤقت للتحقق والاختبار والتواصل القصير دون كشف بريدك الأساسي.",
		footerLinks: {
			faq: "الأسئلة الشائعة",
			privacy: "الخصوصية",
			terms: "الشروط",
			about: "حول smail.pw",
		},
		copyright: "صندوق نظيف، هوية أنظف.",
		themeToLight: "☀ فاتح",
		themeToDark: "🌙 داكن",
	},
};

const messages: Record<Locale, Dictionary> = {
	en,
	zh,
	es,
	fr,
	de,
	ja,
	ko,
	ru,
	pt,
	ar,
};

export function getDictionary(
	locale: Locale,
	siteConfig: SiteConfig = DEFAULT_SITE_CONFIG,
): Dictionary {
	return replaceSiteTextDeep(messages[locale], siteConfig);
}
