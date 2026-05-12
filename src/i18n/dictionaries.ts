export type Locale = 'en' | 'zh-TW';

export const dictionaries: Record<Locale, Record<string, string>> = {
  'en': {
    // Campaign Planner
    'planner.title': 'Campaign Planner',
    'planner.saveDraft': 'Save Draft',
    'planner.continue': 'Continue',
    'planner.searchPlaceholder': 'Search locations...',
    'planner.sortBy': 'Sort by',
    'planner.listView': 'List',
    'planner.mapView': 'Map',
    'planner.showing': 'Showing',
    'planner.locations': 'locations',
    'planner.noResults': 'No locations found',
    'planner.noResultsDesc': 'Try adjusting your filters to see more inventory.',
    'planner.viewDetails': 'View Details',
    'planner.addToPlan': 'Add to Plan',
    'planner.inPlan': 'In Plan',
    'planner.exit': 'Exit Planner',

    // Filter Sidebar
    'filter.title': 'Filters',
    'filter.objective': 'Campaign Objective',
    'filter.city': 'City',
    'filter.district': 'District',
    'filter.venueType': 'Venue Type',
    'filter.screenType': 'Screen Type',
    'filter.audience': 'Audience',
    'filter.budget': 'Budget Range',
    'filter.impressions': 'Impressions Range',
    'filter.availability': 'Availability',
    'filter.reset': 'Reset All',
    'filter.anyObjective': 'Any Objective',
    'filter.awareness': 'Awareness',
    'filter.storeVisits': 'Store visits',
    'filter.productLaunch': 'Product launch',
    'filter.eventPromotion': 'Event promotion',
    'filter.anyCity': 'Any City',
    'filter.clearAll': 'Clear all',
    'filter.available': 'Available',
    'filter.limited': 'Limited',
    'filter.unavailable': 'Unavailable',
    'filter.min': 'Min',
    'filter.max': 'Max',

    // Media Plan
    'mediaPlan.title': 'Media Plan',
    'mediaPlan.empty': 'No items added yet',
    'mediaPlan.emptyDesc': 'Select inventory from the map or list to add to your media plan.',
    'mediaPlan.totalBudget': 'Total Budget',
    'mediaPlan.totalImpressions': 'Est. Impressions',
    'mediaPlan.continueCreative': 'Continue to Creative Upload',
    'mediaPlan.days': 'days',
    'mediaPlan.remove': 'Remove',
    'mediaPlan.campaignEstimate': 'Campaign Estimate',
    'mediaPlan.avgCpm': 'Avg. CPM',
    'mediaPlan.mediaPlanTotal': 'Media Plan Total',

    // Creative Upload
    'creative.title': 'Upload Creative',
    'creative.subtitle': 'Provide the assets for your DOOH campaign',
    'creative.dropzone': 'Drag & drop your files here',
    'creative.dropzoneDesc': 'Support JPG, PNG, and MP4 up to 100MB',
    'creative.browse': 'Browse Files (Mock Upload)',
    'creative.uploaded': 'Uploaded Assets',
    'creative.backToInventory': 'Back to Inventory',
    'creative.continueReview': 'Continue to Review',

    // Review
    'review.title': 'Review Campaign',
    'review.status': 'Draft',
    'review.submit': 'Submit Campaign',
    'review.backToCreative': 'Back to Creative Upload',

    // Map
    'map.noLocations': 'No locations available on the map',
    'map.adjustFilters': 'Try adjusting your filters to see more inventory on the map.',
    'map.available': 'Available',
    'map.limited': 'Limited',
    'map.unavailable': 'Unavailable',
    'map.selectedInPlan': 'Selected in Plan',

    // Inventory Card
    'card.dailyImpressions': 'Daily Impressions',
    'card.pricePerDay': 'Price/Day',
    'card.cpm': 'CPM',
    'card.availability': 'Availability',
    'card.highAvailability': 'High Availability',
    'card.impPerDay': 'imp. / day',
    'card.perDay': 'per day',

    // Step labels
    'step.inventory': 'Inventory',
    'step.creative': 'Creative',
    'step.review': 'Review',

    // Sort options
    'sort.impressionsDesc': 'Impressions (High to Low)',
    'sort.impressionsAsc': 'Impressions (Low to High)',
    'sort.priceDesc': 'Price (High to Low)',
    'sort.priceAsc': 'Price (Low to High)',
    'sort.cpmDesc': 'CPM (High to Low)',
    'sort.cpmAsc': 'CPM (Low to High)',

    // Detail Card
    'detail.close': 'Close',
    'detail.description': 'Description',
    'detail.specifications': 'Specifications',

    // Common
    'common.langToggle': '中文',

    // ── Admin ──────────────────────────────────────────────────────────────

    // Admin Nav
    'admin.brand': 'DOOH Admin',
    'admin.nav.overview': 'Overview',
    'admin.nav.campaigns': 'Campaigns',
    'admin.nav.creative': 'Creative Review',
    'admin.nav.inventory': 'Inventory',
    'admin.nav.screens': 'Screens',
    'admin.nav.settings': 'Settings',
    'admin.nav.signOut': 'Sign Out',

    // Overview Panel
    'admin.overview.totalCampaigns': 'Total Campaigns',
    'admin.overview.pendingReview': 'Pending Review',
    'admin.overview.approvedLive': 'Approved & Live',
    'admin.overview.activeScreens': 'Active Screens',
    'admin.overview.pipelineBudget': 'Pipeline Budget',
    'admin.overview.pipelineBudgetDesc': 'Total budget across all campaigns',
    'admin.overview.estimatedReach': 'Estimated Reach',
    'admin.overview.estimatedReachDesc': 'Total impressions across all campaigns',

    // Campaign Table
    'admin.campaigns.searchPlaceholder': 'Search campaigns...',
    'admin.campaigns.allStatuses': 'All Statuses',
    'admin.campaigns.pendingReview': 'Pending Review',
    'admin.campaigns.live': 'Live',
    'admin.campaigns.col.name': 'Campaign Name',
    'admin.campaigns.col.advertiser': 'Advertiser',
    'admin.campaigns.col.status': 'Status',
    'admin.campaigns.col.locations': 'Locations',
    'admin.campaigns.col.budget': 'Budget',
    'admin.campaigns.col.actions': 'Actions',
    'admin.campaigns.submitted': 'Submitted:',
    'admin.campaigns.viewDetails': 'View Details',
    'admin.campaigns.noResults': 'No campaigns found.',

    // Campaign Detail Panel
    'admin.detail.advertiser': 'Advertiser:',
    'admin.detail.adminNotes': 'Admin Notes',
    'admin.detail.campaignDetails': 'Campaign Details',
    'admin.detail.status': 'Status:',
    'admin.detail.objective': 'Objective:',
    'admin.detail.startDate': 'Start Date:',
    'admin.detail.endDate': 'End Date:',
    'admin.detail.selectedInventory': 'Selected Inventory',
    'admin.detail.days': 'days',
    'admin.detail.totalBudget': 'Total Budget',
    'admin.detail.estImpressions': 'Est. Impressions',
    'admin.detail.creatives': 'Creatives',
    'admin.detail.reject': 'Reject / Request Changes',
    'admin.detail.approve': 'Approve Campaign',
    'admin.detail.close': 'Close',

    // Creative Review Queue
    'admin.creative.title': 'Creative Review Queue',
    'admin.creative.subtitle': 'Review assets for compliance before campaign launch',
    'admin.creative.pending': 'Pending',
    'admin.creative.allCaughtUp': 'All caught up!',
    'admin.creative.noPending': 'There are no creatives pending review.',
    'admin.creative.viewFullSize': 'View Full Size',
    'admin.creative.typeVideo': 'MP4',
    'admin.creative.typeImage': 'Image',
    'admin.creative.campaign': 'Campaign:',
    'admin.creative.advertiser': 'Advertiser:',
    'admin.creative.reject': 'Reject',
    'admin.creative.approve': 'Approve',

    // Inventory Management
    'admin.inventory.searchPlaceholder': 'Search inventory...',
    'admin.inventory.addLocation': '+ Add Location',
    'admin.inventory.col.location': 'Location',
    'admin.inventory.col.district': 'District',
    'admin.inventory.col.type': 'Type',
    'admin.inventory.col.dailyImp': 'Daily Imp.',
    'admin.inventory.col.pricePerDay': 'Price/Day',
    'admin.inventory.col.availability': 'Availability',
    'admin.inventory.col.actions': 'Actions',
    'admin.inventory.availHigh': 'High',
    'admin.inventory.availLimited': 'Limited',
    'admin.inventory.availLow': 'Low',

    // Screen Management
    'admin.screens.searchPlaceholder': 'Search screens by ID or Location...',
    'admin.screens.refreshStatus': 'Refresh Status',
    'admin.screens.col.screenId': 'Screen ID / Name',
    'admin.screens.col.location': 'Location',
    'admin.screens.col.status': 'Status',
    'admin.screens.col.lastHeartbeat': 'Last Heartbeat',
    'admin.screens.col.currentPlayback': 'Current Playback',
    'admin.screens.col.specs': 'Specs',
    'admin.screens.statusOnline': 'ONLINE',
    'admin.screens.statusOffline': 'OFFLINE',
    'admin.screens.statusMaintenance': 'MAINTENANCE',
    'admin.screens.justNow': 'Just now',
    'admin.screens.minutesAgo': 'm ago',
    'admin.screens.hoursAgo': 'h ago',
    'admin.screens.daysAgo': 'd ago',
    'admin.screens.defaultLoop': 'Default Loop',

    // ── Reports ────────────────────────────────────────────────────────────

    'reports.title': 'Campaign Reports',
    'reports.advertiserDashboard': 'Advertiser Dashboard',
    'reports.dataDisclosure': 'Data Disclosure:',
    'reports.dataDisclosureBody': 'Impressions are mathematically estimated based on venue footfall data.',
    'reports.popExplainer': 'Proof-of-play (PoP) logs',
    'reports.popExplainerBody': 'are device-verified playback events confirming your ad was actually rendered on screen.',
    'reports.dailyDeliveryTrend': 'Daily Delivery Trend',
    'reports.deliveryByLocation': 'Delivery by Location',
    'reports.deliveryByCreative': 'Delivery by Creative',
    'reports.verifiedPopLogs': 'Verified Proof-of-Play Logs',
    'reports.popLogsDesc': 'Raw playback records from DOOH hardware.',
    'reports.exportCsv': 'Export CSV',
    'reports.noCampaignSelected': 'No Campaign Selected',
    'reports.noCampaignDesc': 'Please select a campaign from the filter above to view its report.',

    // Report KPI Cards
    'reports.kpi.verifiedPlays': 'Verified Plays',
    'reports.kpi.vsLastWeek': '+12% vs last week',
    'reports.kpi.estimatedImpressions': 'Estimated Impressions',
    'reports.kpi.deliveredSoFar': 'Delivered so far',
    'reports.kpi.spend': 'Spend',
    'reports.kpi.avgCpm': 'Avg CPM',
    'reports.kpi.basedOnImp': 'Based on est. impressions',

    // Report Filters
    'reports.filters.title': 'Filters',
    'reports.filters.selectCampaign': 'Select a campaign...',
    'reports.filters.last7Days': 'Last 7 Days',
    'reports.filters.last30Days': 'Last 30 Days',
    'reports.filters.thisMonth': 'This Month',
    'reports.filters.allTime': 'All Time',
    'reports.filters.allLocations': 'All Locations',
    'reports.filters.locationComingSoon': 'Location filtering coming soon',

    // Delivery Status Badges
    'reports.status.onTrack': 'On Track',
    'reports.status.underDelivering': 'Under Delivering',
    'reports.status.completed': 'Completed',
    'reports.status.paused': 'Paused',

    // Plays by Location Table
    'reports.location.col.location': 'Location',
    'reports.location.col.screens': 'Screens',
    'reports.location.col.plays': 'Plays',
    'reports.location.col.estImp': 'Est. Imp.',
    'reports.location.col.spend': 'Spend',
    'reports.location.col.status': 'Status',
    'reports.location.noData': 'No location data available',

    // Plays by Creative Table
    'reports.creative.col.asset': 'Creative Asset',
    'reports.creative.col.plays': 'Plays',
    'reports.creative.col.completionRate': 'Completion Rate',
    'reports.creative.col.estImp': 'Est. Imp.',
    'reports.creative.col.status': 'Status',
    'reports.creative.noData': 'No creative data available',

    // Proof of Play Table
    'reports.pop.col.timestamp': 'Timestamp',
    'reports.pop.col.screen': 'Screen',
    'reports.pop.col.creative': 'Creative',
    'reports.pop.col.duration': 'Duration',
    'reports.pop.col.playbackStatus': 'Playback Status',
    'reports.pop.noData': 'No proof-of-play logs available for this campaign yet.',

    // Delivery Chart
    'reports.chart.noData': 'No delivery data available',
    'reports.chart.plays': 'Plays',
    'reports.chart.estImp': 'Est. Imp.',
    'reports.chart.legendPlays': 'Verified Plays (PoP)',
    'reports.chart.legendImp': 'Estimated Impressions',
  },
  'zh-TW': {
    // Campaign Planner
    'planner.title': '廣告企劃',
    'planner.saveDraft': '儲存草稿',
    'planner.continue': '繼續',
    'planner.searchPlaceholder': '搜尋版位...',
    'planner.sortBy': '排序方式',
    'planner.listView': '列表',
    'planner.mapView': '地圖',
    'planner.showing': '顯示',
    'planner.locations': '個版位',
    'planner.noResults': '找不到符合條件的版位',
    'planner.noResultsDesc': '請試著調整篩選條件以查看更多版位。',
    'planner.viewDetails': '查看詳情',
    'planner.addToPlan': '加入計畫',
    'planner.inPlan': '已加入',
    'planner.exit': '離開企劃',

    // Filter Sidebar
    'filter.title': '篩選條件',
    'filter.objective': '活動目標',
    'filter.city': '城市',
    'filter.district': '區域',
    'filter.venueType': '場域類型',
    'filter.screenType': '螢幕類型',
    'filter.audience': '目標受眾',
    'filter.budget': '預算範圍',
    'filter.impressions': '曝光範圍',
    'filter.availability': '可用性',
    'filter.reset': '重設全部',
    'filter.anyObjective': '不限目標',
    'filter.awareness': '品牌曝光',
    'filter.storeVisits': '門市來客',
    'filter.productLaunch': '新品上市',
    'filter.eventPromotion': '活動推廣',
    'filter.anyCity': '不限城市',
    'filter.clearAll': '全部清除',
    'filter.available': '可用',
    'filter.limited': '有限',
    'filter.unavailable': '不可用',
    'filter.min': '最小',
    'filter.max': '最大',

    // Media Plan
    'mediaPlan.title': '媒體計畫',
    'mediaPlan.empty': '尚未加入任何版位',
    'mediaPlan.emptyDesc': '從地圖或列表中選擇版位以加入您的媒體計畫。',
    'mediaPlan.totalBudget': '總預算',
    'mediaPlan.totalImpressions': '預估曝光',
    'mediaPlan.continueCreative': '繼續上傳素材',
    'mediaPlan.days': '天',
    'mediaPlan.remove': '移除',
    'mediaPlan.campaignEstimate': '活動預估',
    'mediaPlan.avgCpm': '平均 CPM',
    'mediaPlan.mediaPlanTotal': '媒體計畫總額',

    // Creative Upload
    'creative.title': '上傳素材',
    'creative.subtitle': '為您的戶外廣告活動提供廣告素材',
    'creative.dropzone': '將檔案拖曳至此',
    'creative.dropzoneDesc': '支援 JPG、PNG 及 MP4，最大 100MB',
    'creative.browse': '瀏覽檔案（模擬上傳）',
    'creative.uploaded': '已上傳素材',
    'creative.backToInventory': '返回版位選擇',
    'creative.continueReview': '繼續確認',

    // Review
    'review.title': '確認活動',
    'review.status': '草稿',
    'review.submit': '提交活動',
    'review.backToCreative': '返回素材上傳',

    // Map
    'map.noLocations': '地圖上沒有可用的版位',
    'map.adjustFilters': '請試著調整篩選條件以查看更多版位。',
    'map.available': '可用',
    'map.limited': '有限',
    'map.unavailable': '不可用',
    'map.selectedInPlan': '已選取',

    // Inventory Card
    'card.dailyImpressions': '每日曝光',
    'card.pricePerDay': '每日價格',
    'card.cpm': 'CPM',
    'card.availability': '可用性',
    'card.highAvailability': '高可用性',
    'card.impPerDay': '次曝光 / 天',
    'card.perDay': '每天',

    // Step labels
    'step.inventory': '版位選擇',
    'step.creative': '素材上傳',
    'step.review': '確認審查',

    // Sort options
    'sort.impressionsDesc': '曝光（高至低）',
    'sort.impressionsAsc': '曝光（低至高）',
    'sort.priceDesc': '價格（高至低）',
    'sort.priceAsc': '價格（低至高）',
    'sort.cpmDesc': 'CPM（高至低）',
    'sort.cpmAsc': 'CPM（低至高）',

    // Detail Card
    'detail.close': '關閉',
    'detail.description': '說明',
    'detail.specifications': '規格',

    // Common
    'common.langToggle': 'EN',

    // ── 後台管理 ────────────────────────────────────────────────────────────

    // Admin Nav
    'admin.brand': 'DOOH 後台',
    'admin.nav.overview': '總覽',
    'admin.nav.campaigns': '廣告活動',
    'admin.nav.creative': '素材審查',
    'admin.nav.inventory': '版位管理',
    'admin.nav.screens': '螢幕管理',
    'admin.nav.settings': '設定',
    'admin.nav.signOut': '登出',

    // Overview Panel
    'admin.overview.totalCampaigns': '廣告活動總數',
    'admin.overview.pendingReview': '待審核',
    'admin.overview.approvedLive': '已核准 / 上線',
    'admin.overview.activeScreens': '在線螢幕',
    'admin.overview.pipelineBudget': '總預算規模',
    'admin.overview.pipelineBudgetDesc': '所有廣告活動的預算總計',
    'admin.overview.estimatedReach': '預估觸及',
    'admin.overview.estimatedReachDesc': '所有廣告活動的曝光總計',

    // Campaign Table
    'admin.campaigns.searchPlaceholder': '搜尋廣告活動...',
    'admin.campaigns.allStatuses': '所有狀態',
    'admin.campaigns.pendingReview': '待審核',
    'admin.campaigns.live': '上線中',
    'admin.campaigns.col.name': '活動名稱',
    'admin.campaigns.col.advertiser': '廣告主',
    'admin.campaigns.col.status': '狀態',
    'admin.campaigns.col.locations': '版位數',
    'admin.campaigns.col.budget': '預算',
    'admin.campaigns.col.actions': '操作',
    'admin.campaigns.submitted': '提交時間：',
    'admin.campaigns.viewDetails': '查看詳情',
    'admin.campaigns.noResults': '找不到符合的廣告活動。',

    // Campaign Detail Panel
    'admin.detail.advertiser': '廣告主：',
    'admin.detail.adminNotes': '管理員備註',
    'admin.detail.campaignDetails': '活動詳情',
    'admin.detail.status': '狀態：',
    'admin.detail.objective': '目標：',
    'admin.detail.startDate': '開始日期：',
    'admin.detail.endDate': '結束日期：',
    'admin.detail.selectedInventory': '已選版位',
    'admin.detail.days': '天',
    'admin.detail.totalBudget': '總預算',
    'admin.detail.estImpressions': '預估曝光',
    'admin.detail.creatives': '廣告素材',
    'admin.detail.reject': '拒絕 / 要求修改',
    'admin.detail.approve': '核准活動',
    'admin.detail.close': '關閉',

    // Creative Review Queue
    'admin.creative.title': '素材審查佇列',
    'admin.creative.subtitle': '活動上線前，請審核素材是否符合規範',
    'admin.creative.pending': '待審核',
    'admin.creative.allCaughtUp': '全部完成！',
    'admin.creative.noPending': '目前沒有待審核的素材。',
    'admin.creative.viewFullSize': '查看原始大小',
    'admin.creative.typeVideo': 'MP4 影片',
    'admin.creative.typeImage': '圖片',
    'admin.creative.campaign': '活動：',
    'admin.creative.advertiser': '廣告主：',
    'admin.creative.reject': '拒絕',
    'admin.creative.approve': '核准',

    // Inventory Management
    'admin.inventory.searchPlaceholder': '搜尋版位...',
    'admin.inventory.addLocation': '＋ 新增版位',
    'admin.inventory.col.location': '地點',
    'admin.inventory.col.district': '區域',
    'admin.inventory.col.type': '類型',
    'admin.inventory.col.dailyImp': '每日曝光',
    'admin.inventory.col.pricePerDay': '每日價格',
    'admin.inventory.col.availability': '可用性',
    'admin.inventory.col.actions': '操作',
    'admin.inventory.availHigh': '高',
    'admin.inventory.availLimited': '有限',
    'admin.inventory.availLow': '低',

    // Screen Management
    'admin.screens.searchPlaceholder': '依螢幕 ID 或地點搜尋...',
    'admin.screens.refreshStatus': '重新整理狀態',
    'admin.screens.col.screenId': '螢幕 ID / 名稱',
    'admin.screens.col.location': '地點',
    'admin.screens.col.status': '狀態',
    'admin.screens.col.lastHeartbeat': '最後心跳',
    'admin.screens.col.currentPlayback': '目前播放',
    'admin.screens.col.specs': '規格',
    'admin.screens.statusOnline': '在線',
    'admin.screens.statusOffline': '離線',
    'admin.screens.statusMaintenance': '維護中',
    'admin.screens.justNow': '剛剛',
    'admin.screens.minutesAgo': '分鐘前',
    'admin.screens.hoursAgo': '小時前',
    'admin.screens.daysAgo': '天前',
    'admin.screens.defaultLoop': '預設循環',

    // ── 報表 ────────────────────────────────────────────────────────────────

    'reports.title': '活動報表',
    'reports.advertiserDashboard': '廣告主儀表板',
    'reports.dataDisclosure': '數據說明：',
    'reports.dataDisclosureBody': '曝光次數係依據場地流量數據進行數學估算。',
    'reports.popExplainer': '播放驗證紀錄（PoP）',
    'reports.popExplainerBody': '為裝置驗證的播放事件，確認廣告已實際顯示於螢幕上。',
    'reports.dailyDeliveryTrend': '每日投放趨勢',
    'reports.deliveryByLocation': '各地點投放量',
    'reports.deliveryByCreative': '各素材投放量',
    'reports.verifiedPopLogs': '已驗證播放紀錄',
    'reports.popLogsDesc': 'DOOH 硬體設備的原始播放記錄。',
    'reports.exportCsv': '匯出 CSV',
    'reports.noCampaignSelected': '尚未選擇活動',
    'reports.noCampaignDesc': '請從上方篩選器選擇廣告活動以查看報表。',

    // Report KPI Cards
    'reports.kpi.verifiedPlays': '已驗證播放次數',
    'reports.kpi.vsLastWeek': '較上週 +12%',
    'reports.kpi.estimatedImpressions': '預估曝光次數',
    'reports.kpi.deliveredSoFar': '已投放',
    'reports.kpi.spend': '已花費',
    'reports.kpi.avgCpm': '平均 CPM',
    'reports.kpi.basedOnImp': '依預估曝光計算',

    // Report Filters
    'reports.filters.title': '篩選條件',
    'reports.filters.selectCampaign': '選擇廣告活動...',
    'reports.filters.last7Days': '最近 7 天',
    'reports.filters.last30Days': '最近 30 天',
    'reports.filters.thisMonth': '本月',
    'reports.filters.allTime': '全部時間',
    'reports.filters.allLocations': '所有地點',
    'reports.filters.locationComingSoon': '地點篩選功能即將推出',

    // Delivery Status Badges
    'reports.status.onTrack': '進度正常',
    'reports.status.underDelivering': '投放不足',
    'reports.status.completed': '已完成',
    'reports.status.paused': '已暫停',

    // Plays by Location Table
    'reports.location.col.location': '地點',
    'reports.location.col.screens': '螢幕數',
    'reports.location.col.plays': '播放次數',
    'reports.location.col.estImp': '預估曝光',
    'reports.location.col.spend': '已花費',
    'reports.location.col.status': '狀態',
    'reports.location.noData': '目前無地點數據',

    // Plays by Creative Table
    'reports.creative.col.asset': '廣告素材',
    'reports.creative.col.plays': '播放次數',
    'reports.creative.col.completionRate': '完整播放率',
    'reports.creative.col.estImp': '預估曝光',
    'reports.creative.col.status': '狀態',
    'reports.creative.noData': '目前無素材數據',

    // Proof of Play Table
    'reports.pop.col.timestamp': '時間戳記',
    'reports.pop.col.screen': '螢幕',
    'reports.pop.col.creative': '素材',
    'reports.pop.col.duration': '時長',
    'reports.pop.col.playbackStatus': '播放狀態',
    'reports.pop.noData': '此活動目前尚無播放驗證紀錄。',

    // Delivery Chart
    'reports.chart.noData': '目前無投放數據',
    'reports.chart.plays': '播放次數',
    'reports.chart.estImp': '預估曝光',
    'reports.chart.legendPlays': '已驗證播放（PoP）',
    'reports.chart.legendImp': '預估曝光次數',
  }
};
