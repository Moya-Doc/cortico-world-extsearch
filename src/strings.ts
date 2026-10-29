import type { Language } from 'cortico/core/language.ts';

export interface ExtSearchStrings {
  label: string;
  promptTitle: string;
  promptDescription: string;
  configDescription: string;
  indexBaseTitle: string;
  indexBaseDescription: string;
  maxResultsTitle: string;
  maxResultsDescription: string;
  favoritesTitle: string;
  storageDescription: string;
  filter: string;
  loading: string;
  empty: string;
  noResults: string;
  reload: string;
  refresh: string;
  remove: string;
  savedAt: string;
  updatedAt: string;
  author: string;
  platforms: string;
  platformsUnspecified: string;
  platformExcluded: string;
  platformsDeclared: string;
  official: string;
  certified: string;
  missing: string;
  blocked: string;
  snapshot: string;
  error: string;
  links: string;
  deprecated: string;
  badName: string;
  notSaved: string;
  indexUnavailable: string;
  unknownMethod: string;
  storageCleared: string;
  favoriteChanged: string;
}

const TEXT: Record<Language, ExtSearchStrings> = {
  zh: {
    platformsUnspecified: "未声明平台限制", platformExcluded: "不支持 {platform}", platformsDeclared: "平台声明：{platforms}",
    favoriteChanged: "刷新期间该收藏已发生变化，请重新刷新。",
    badName: "请提供有效的扩展包名。", notSaved: "该扩展尚未收藏。", indexUnavailable: "无法刷新扩展索引。", unknownMethod: "未知的收藏操作。", storageCleared: "收藏已清除。",
    label: '扩展市场搜索', promptTitle: '扩展市场搜索 · 环境提示词', promptDescription: '搜索扩展、选择候选和管理收藏的指引。',
    configDescription: '搜索扩展索引，保存本地收藏。', indexBaseTitle: '索引源', indexBaseDescription: '提供 index.json 和 catalog.json 的 HTTP(S) 目录地址。',
    maxResultsTitle: '最多返回', maxResultsDescription: '每次搜索返回的扩展数量上限。', favoritesTitle: '收藏', storageDescription: '收藏的扩展信息快照。',
    filter: '搜索收藏', loading: '正在读取收藏…', empty: '暂无收藏。可以让 Coo 收藏搜索结果中的扩展。', noResults: '没有匹配的收藏。',
    reload: '重新加载', refresh: '刷新信息', remove: '取消收藏', savedAt: '收藏时间', updatedAt: '记录更新', author: '作者', platforms: '平台',
    official: '官方', certified: '已认证', missing: '索引中未找到', blocked: '已被市场屏蔽', snapshot: '已保存的信息快照', error: '操作失败', links: '项目链接', deprecated: '已弃用',
  },
  'zh-Hant': {
    platformsUnspecified: "未宣告平台限制", platformExcluded: "不支援 {platform}", platformsDeclared: "平台宣告：{platforms}",
    favoriteChanged: "更新期間此收藏已變更，請重新更新。",
    badName: "請提供有效的擴充套件名稱。", notSaved: "此擴充套件尚未收藏。", indexUnavailable: "無法更新擴充套件索引。", unknownMethod: "未知的收藏操作。", storageCleared: "收藏已清除。",
    label: '擴充套件市場搜尋', promptTitle: '擴充套件市場搜尋 · 環境提示詞', promptDescription: '搜尋擴充套件、選擇候選和管理收藏的指引。',
    configDescription: '搜尋擴充套件索引，儲存本機收藏。', indexBaseTitle: '索引來源', indexBaseDescription: '提供 index.json 和 catalog.json 的 HTTP(S) 目錄網址。',
    maxResultsTitle: '最多傳回', maxResultsDescription: '每次搜尋傳回的擴充套件數量上限。', favoritesTitle: '收藏', storageDescription: '收藏的擴充套件資訊快照。',
    filter: '搜尋收藏', loading: '正在讀取收藏…', empty: '尚無收藏。可以請 Coo 收藏搜尋結果中的擴充套件。', noResults: '沒有符合的收藏。',
    reload: '重新載入', refresh: '更新資訊', remove: '取消收藏', savedAt: '收藏時間', updatedAt: '紀錄更新', author: '作者', platforms: '平台',
    official: '官方', certified: '已認證', missing: '索引中未找到', blocked: '已被市場封鎖', snapshot: '已儲存的資訊快照', error: '操作失敗', links: '專案連結', deprecated: '已棄用',
  },
  en: {
    platformsUnspecified: "No platform restriction declared", platformExcluded: "Not supported: {platform}", platformsDeclared: "Declared platforms: {platforms}",
    favoriteChanged: "This favorite changed while refreshing. Refresh it again.",
    badName: "Provide a valid extension package name.", notSaved: "This extension is not saved.", indexUnavailable: "The extension index could not be refreshed.", unknownMethod: "Unknown favorites operation.", storageCleared: "Favorites cleared.",
    label: 'Extension Market Search', promptTitle: 'Extension Market Search · Environment prompt', promptDescription: 'Guidance for searching extensions, choosing candidates and managing favorites.',
    configDescription: 'Search the extension index and save local favorites.', indexBaseTitle: 'Index source', indexBaseDescription: 'HTTP(S) directory URL serving index.json and catalog.json.',
    maxResultsTitle: 'Maximum results', maxResultsDescription: 'Maximum number of extensions returned per search.', favoritesTitle: 'Favorites', storageDescription: 'Saved extension information snapshots.',
    filter: 'Search favorites', loading: 'Loading favorites…', empty: 'No favorites yet. Ask Coo to save an extension from the search results.', noResults: 'No matching favorites.',
    reload: 'Reload', refresh: 'Refresh information', remove: 'Remove favorite', savedAt: 'Saved', updatedAt: 'Record updated', author: 'Author', platforms: 'Platforms',
    official: 'Official', certified: 'Certified', missing: 'Not found in index', blocked: 'Blocked by market', snapshot: 'Saved information snapshot', error: 'Operation failed', links: 'Project links', deprecated: 'Deprecated',
  },
  ja: {
    platformsUnspecified: "プラットフォーム制限の指定なし", platformExcluded: "{platform} 非対応", platformsDeclared: "指定プラットフォーム：{platforms}",
    favoriteChanged: "更新中にこのお気に入りが変更されました。もう一度更新してください。",
    badName: "有効な拡張機能のパッケージ名を入力してください。", notSaved: "この拡張機能は保存されていません。", indexUnavailable: "拡張機能の索引を更新できませんでした。", unknownMethod: "不明なお気に入り操作です。", storageCleared: "お気に入りを消去しました。",
    label: '拡張機能マーケット検索', promptTitle: '拡張機能マーケット検索 · 環境プロンプト', promptDescription: '拡張機能の検索、候補選択、お気に入り管理の指針。',
    configDescription: '拡張機能の索引を検索し、お気に入りをローカルに保存します。', indexBaseTitle: '索引の取得元', indexBaseDescription: 'index.json と catalog.json を提供する HTTP(S) ディレクトリの URL。',
    maxResultsTitle: '最大件数', maxResultsDescription: '検索ごとに返す拡張機能の最大件数。', favoritesTitle: 'お気に入り', storageDescription: 'お気に入りに保存した拡張機能の情報。',
    filter: 'お気に入りを検索', loading: 'お気に入りを読み込み中…', empty: 'お気に入りはまだありません。検索結果の拡張機能を保存するよう Coo に依頼できます。', noResults: '一致するお気に入りはありません。',
    reload: '再読み込み', refresh: '情報を更新', remove: 'お気に入りから削除', savedAt: '保存日時', updatedAt: '記録更新日時', author: '作者', platforms: 'プラットフォーム',
    official: '公式', certified: '認定済み', missing: '索引に見つかりません', blocked: 'マーケットでブロック済み', snapshot: '保存済みの情報', error: '操作に失敗しました', links: 'プロジェクトのリンク', deprecated: '非推奨',
  },
  ko: {
    platformsUnspecified: "플랫폼 제한 선언 없음", platformExcluded: "지원하지 않음: {platform}", platformsDeclared: "선언된 플랫폼: {platforms}",
    favoriteChanged: "새로고침 중에 이 즐겨찾기가 변경되었습니다. 다시 새로고침하세요.",
    badName: "올바른 확장 패키지 이름을 입력하세요.", notSaved: "저장되지 않은 확장입니다.", indexUnavailable: "확장 색인을 새로고침할 수 없습니다.", unknownMethod: "알 수 없는 즐겨찾기 작업입니다.", storageCleared: "즐겨찾기를 지웠습니다.",
    label: '확장 마켓 검색', promptTitle: '확장 마켓 검색 · 환경 프롬프트', promptDescription: '확장 검색, 후보 선택 및 즐겨찾기 관리 지침입니다.',
    configDescription: '확장 색인을 검색하고 로컬 즐겨찾기를 저장합니다.', indexBaseTitle: '색인 소스', indexBaseDescription: 'index.json 및 catalog.json을 제공하는 HTTP(S) 디렉터리 URL입니다.',
    maxResultsTitle: '최대 결과 수', maxResultsDescription: '검색마다 반환할 확장의 최대 개수입니다.', favoritesTitle: '즐겨찾기', storageDescription: '즐겨찾기에 저장한 확장 정보 스냅샷입니다.',
    filter: '즐겨찾기 검색', loading: '즐겨찾기를 불러오는 중…', empty: '즐겨찾기가 없습니다. Coo에게 검색 결과의 확장을 저장해 달라고 요청하세요.', noResults: '일치하는 즐겨찾기가 없습니다.',
    reload: '다시 불러오기', refresh: '정보 새로고침', remove: '즐겨찾기 해제', savedAt: '저장 시각', updatedAt: '기록 갱신', author: '작성자', platforms: '플랫폼',
    official: '공식', certified: '인증됨', missing: '색인에서 찾을 수 없음', blocked: '마켓에서 차단됨', snapshot: '저장된 정보 스냅샷', error: '작업 실패', links: '프로젝트 링크', deprecated: '사용 중단',
  },
  fr: {
    platformsUnspecified: "Aucune restriction de plateforme déclarée", platformExcluded: "Non pris en charge : {platform}", platformsDeclared: "Plateformes déclarées : {platforms}",
    favoriteChanged: "Ce favori a changé pendant l’actualisation. Actualisez-le à nouveau.",
    badName: "Indiquez un nom de paquet d’extension valide.", notSaved: "Cette extension n’est pas enregistrée.", indexUnavailable: "L’index des extensions n’a pas pu être actualisé.", unknownMethod: "Opération de favoris inconnue.", storageCleared: "Favoris effacés.",
    label: 'Recherche d’extensions', promptTitle: 'Recherche d’extensions · Consigne d’environnement', promptDescription: 'Consignes pour rechercher des extensions, choisir des candidats et gérer les favoris.',
    configDescription: 'Rechercher dans l’index des extensions et enregistrer des favoris locaux.', indexBaseTitle: 'Source de l’index', indexBaseDescription: 'URL du répertoire HTTP(S) contenant index.json et catalog.json.',
    maxResultsTitle: 'Résultats maximum', maxResultsDescription: 'Nombre maximum d’extensions renvoyées par recherche.', favoritesTitle: 'Favoris', storageDescription: 'Copies enregistrées des informations des extensions.',
    filter: 'Rechercher dans les favoris', loading: 'Chargement des favoris…', empty: 'Aucun favori. Demandez à Coo d’enregistrer une extension parmi les résultats.', noResults: 'Aucun favori correspondant.',
    reload: 'Recharger', refresh: 'Actualiser les informations', remove: 'Retirer des favoris', savedAt: 'Enregistré le', updatedAt: 'Fiche actualisée le', author: 'Auteur', platforms: 'Plateformes',
    official: 'Officiel', certified: 'Certifié', missing: 'Absent de l’index', blocked: 'Bloqué par le marché', snapshot: 'Copie des informations enregistrées', error: 'Échec de l’opération', links: 'Liens du projet', deprecated: 'Obsolète',
  },
  de: {
    platformsUnspecified: "Keine Plattformbeschränkung angegeben", platformExcluded: "Nicht unterstützt: {platform}", platformsDeclared: "Angegebene Plattformen: {platforms}",
    favoriteChanged: "Dieser Favorit wurde während der Aktualisierung geändert. Aktualisiere ihn erneut.",
    badName: "Gib einen gültigen Erweiterungspaketnamen an.", notSaved: "Diese Erweiterung ist nicht gespeichert.", indexUnavailable: "Der Erweiterungsindex konnte nicht aktualisiert werden.", unknownMethod: "Unbekannter Favoritenvorgang.", storageCleared: "Favoriten gelöscht.",
    label: 'Erweiterungssuche', promptTitle: 'Erweiterungssuche · Umgebungsanweisung', promptDescription: 'Anweisungen zur Suche nach Erweiterungen, zur Auswahl und zur Verwaltung von Favoriten.',
    configDescription: 'Erweiterungsindex durchsuchen und Favoriten lokal speichern.', indexBaseTitle: 'Indexquelle', indexBaseDescription: 'HTTP(S)-Verzeichnisadresse mit index.json und catalog.json.',
    maxResultsTitle: 'Maximale Ergebnisse', maxResultsDescription: 'Maximale Anzahl der Erweiterungen pro Suche.', favoritesTitle: 'Favoriten', storageDescription: 'Gespeicherte Momentaufnahmen der Erweiterungsinformationen.',
    filter: 'Favoriten durchsuchen', loading: 'Favoriten werden geladen…', empty: 'Noch keine Favoriten. Bitte Coo, eine Erweiterung aus den Suchergebnissen zu speichern.', noResults: 'Keine passenden Favoriten.',
    reload: 'Neu laden', refresh: 'Informationen aktualisieren', remove: 'Favorit entfernen', savedAt: 'Gespeichert', updatedAt: 'Eintrag aktualisiert', author: 'Autor', platforms: 'Plattformen',
    official: 'Offiziell', certified: 'Zertifiziert', missing: 'Nicht im Index gefunden', blocked: 'Vom Markt gesperrt', snapshot: 'Gespeicherte Informationen', error: 'Vorgang fehlgeschlagen', links: 'Projektlinks', deprecated: 'Veraltet',
  },
  'es-419': {
    platformsUnspecified: "Sin restricciones de plataforma declaradas", platformExcluded: "No compatible con {platform}", platformsDeclared: "Plataformas declaradas: {platforms}",
    favoriteChanged: "Este favorito cambió durante la actualización. Vuelve a actualizarlo.",
    badName: "Indica un nombre de paquete de extensión válido.", notSaved: "Esta extensión no está guardada.", indexUnavailable: "No se pudo actualizar el índice de extensiones.", unknownMethod: "Operación de favoritos desconocida.", storageCleared: "Se borraron los favoritos.",
    label: 'Búsqueda de extensiones', promptTitle: 'Búsqueda de extensiones · Instrucción de entorno', promptDescription: 'Instrucciones para buscar extensiones, elegir opciones y administrar favoritos.',
    configDescription: 'Busca en el índice de extensiones y guarda favoritos locales.', indexBaseTitle: 'Fuente del índice', indexBaseDescription: 'URL del directorio HTTP(S) que contiene index.json y catalog.json.',
    maxResultsTitle: 'Máximo de resultados', maxResultsDescription: 'Número máximo de extensiones por búsqueda.', favoritesTitle: 'Favoritos', storageDescription: 'Copias guardadas de la información de las extensiones.',
    filter: 'Buscar en favoritos', loading: 'Cargando favoritos…', empty: 'Aún no hay favoritos. Pídele a Coo que guarde una extensión de los resultados.', noResults: 'No hay favoritos que coincidan.',
    reload: 'Volver a cargar', refresh: 'Actualizar información', remove: 'Quitar de favoritos', savedAt: 'Guardado', updatedAt: 'Registro actualizado', author: 'Autor', platforms: 'Plataformas',
    official: 'Oficial', certified: 'Certificado', missing: 'No se encontró en el índice', blocked: 'Bloqueado por el mercado', snapshot: 'Copia guardada de la información', error: 'La operación falló', links: 'Enlaces del proyecto', deprecated: 'Obsoleto',
  },
  'pt-BR': {
    platformsUnspecified: "Nenhuma restrição de plataforma declarada", platformExcluded: "Sem suporte a {platform}", platformsDeclared: "Plataformas declaradas: {platforms}",
    favoriteChanged: "Este favorito mudou durante a atualização. Atualize novamente.",
    badName: "Informe um nome válido de pacote de extensão.", notSaved: "Esta extensão não está salva.", indexUnavailable: "Não foi possível atualizar o índice de extensões.", unknownMethod: "Operação de favoritos desconhecida.", storageCleared: "Favoritos apagados.",
    label: 'Busca de extensões', promptTitle: 'Busca de extensões · Instrução de ambiente', promptDescription: 'Instruções para buscar extensões, escolher opções e gerenciar favoritos.',
    configDescription: 'Pesquisa o índice de extensões e salva favoritos locais.', indexBaseTitle: 'Fonte do índice', indexBaseDescription: 'URL do diretório HTTP(S) que fornece index.json e catalog.json.',
    maxResultsTitle: 'Máximo de resultados', maxResultsDescription: 'Número máximo de extensões retornadas por busca.', favoritesTitle: 'Favoritos', storageDescription: 'Cópias salvas das informações das extensões.',
    filter: 'Buscar favoritos', loading: 'Carregando favoritos…', empty: 'Ainda não há favoritos. Peça ao Coo para salvar uma extensão dos resultados.', noResults: 'Nenhum favorito correspondente.',
    reload: 'Recarregar', refresh: 'Atualizar informações', remove: 'Remover dos favoritos', savedAt: 'Salvo em', updatedAt: 'Registro atualizado', author: 'Autor', platforms: 'Plataformas',
    official: 'Oficial', certified: 'Certificado', missing: 'Não encontrado no índice', blocked: 'Bloqueado pelo mercado', snapshot: 'Cópia salva das informações', error: 'Falha na operação', links: 'Links do projeto', deprecated: 'Obsoleto',
  },
  it: {
    platformsUnspecified: "Nessuna restrizione di piattaforma dichiarata", platformExcluded: "Non supportato: {platform}", platformsDeclared: "Piattaforme dichiarate: {platforms}",
    favoriteChanged: "Questo preferito è cambiato durante l’aggiornamento. Aggiornalo di nuovo.",
    badName: "Inserisci un nome di pacchetto di estensione valido.", notSaved: "Questa estensione non è salvata.", indexUnavailable: "Impossibile aggiornare l’indice delle estensioni.", unknownMethod: "Operazione sui preferiti sconosciuta.", storageCleared: "Preferiti cancellati.",
    label: 'Ricerca estensioni', promptTitle: 'Ricerca estensioni · Istruzioni di ambiente', promptDescription: 'Istruzioni per cercare estensioni, scegliere candidati e gestire i preferiti.',
    configDescription: 'Cerca nell’indice delle estensioni e salva i preferiti in locale.', indexBaseTitle: 'Fonte dell’indice', indexBaseDescription: 'URL della cartella HTTP(S) che contiene index.json e catalog.json.',
    maxResultsTitle: 'Risultati massimi', maxResultsDescription: 'Numero massimo di estensioni per ricerca.', favoritesTitle: 'Preferiti', storageDescription: 'Copie salvate delle informazioni sulle estensioni.',
    filter: 'Cerca nei preferiti', loading: 'Caricamento dei preferiti…', empty: 'Nessun preferito. Chiedi a Coo di salvare un’estensione dai risultati di ricerca.', noResults: 'Nessun preferito corrispondente.',
    reload: 'Ricarica', refresh: 'Aggiorna informazioni', remove: 'Rimuovi dai preferiti', savedAt: 'Salvato il', updatedAt: 'Voce aggiornata', author: 'Autore', platforms: 'Piattaforme',
    official: 'Ufficiale', certified: 'Certificato', missing: 'Non trovato nell’indice', blocked: 'Bloccato dal mercato', snapshot: 'Copia delle informazioni salvate', error: 'Operazione non riuscita', links: 'Link del progetto', deprecated: 'Deprecato',
  },
  ru: {
    platformsUnspecified: "Ограничения платформ не указаны", platformExcluded: "Не поддерживается: {platform}", platformsDeclared: "Заявленные платформы: {platforms}",
    favoriteChanged: "Это избранное изменилось во время обновления. Обновите его снова.",
    badName: "Укажите допустимое имя пакета расширения.", notSaved: "Это расширение не сохранено.", indexUnavailable: "Не удалось обновить индекс расширений.", unknownMethod: "Неизвестное действие с избранным.", storageCleared: "Избранное очищено.",
    label: 'Поиск расширений', promptTitle: 'Поиск расширений · Инструкция среды', promptDescription: 'Инструкции по поиску расширений, выбору кандидатов и управлению избранным.',
    configDescription: 'Поиск по индексу расширений и сохранение избранного на устройстве.', indexBaseTitle: 'Источник индекса', indexBaseDescription: 'HTTP(S)-адрес каталога с index.json и catalog.json.',
    maxResultsTitle: 'Максимум результатов', maxResultsDescription: 'Максимальное число расширений в результатах поиска.', favoritesTitle: 'Избранное', storageDescription: 'Сохранённые снимки информации о расширениях.',
    filter: 'Поиск в избранном', loading: 'Загрузка избранного…', empty: 'В избранном пока пусто. Попросите Coo сохранить расширение из результатов поиска.', noResults: 'Совпадений в избранном нет.',
    reload: 'Перезагрузить', refresh: 'Обновить информацию', remove: 'Убрать из избранного', savedAt: 'Сохранено', updatedAt: 'Запись обновлена', author: 'Автор', platforms: 'Платформы',
    official: 'Официальное', certified: 'Сертифицировано', missing: 'Не найдено в индексе', blocked: 'Заблокировано в каталоге', snapshot: 'Сохранённый снимок информации', error: 'Не удалось выполнить действие', links: 'Ссылки проекта', deprecated: 'Устарело',
  },
};

export function extSearchStrings(language: Language): ExtSearchStrings {
  return TEXT[language];
}
