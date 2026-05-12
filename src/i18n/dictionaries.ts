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

    // Media Plan
    'mediaPlan.title': 'Media Plan',
    'mediaPlan.empty': 'No items added yet',
    'mediaPlan.emptyDesc': 'Select inventory from the map or list to add to your media plan.',
    'mediaPlan.totalBudget': 'Total Budget',
    'mediaPlan.totalImpressions': 'Est. Impressions',
    'mediaPlan.continueCreative': 'Continue to Creative Upload',
    'mediaPlan.days': 'days',
    'mediaPlan.remove': 'Remove',

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

    // Filter dropdown options
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

    // Media Plan extra
    'mediaPlan.campaignEstimate': 'Campaign Estimate',
    'mediaPlan.avgCpm': 'Avg. CPM',
    'mediaPlan.mediaPlanTotal': 'Media Plan Total',

    // Detail Card
    'detail.close': 'Close',
    'detail.description': 'Description',
    'detail.specifications': 'Specifications',

    // Exit
    'planner.exit': 'Exit Planner',

    // Common
    'common.langToggle': '中文',
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

    // Media Plan
    'mediaPlan.title': '媒體計畫',
    'mediaPlan.empty': '尚未加入任何版位',
    'mediaPlan.emptyDesc': '從地圖或列表中選擇版位以加入您的媒體計畫。',
    'mediaPlan.totalBudget': '總預算',
    'mediaPlan.totalImpressions': '預估曝光',
    'mediaPlan.continueCreative': '繼續上傳素材',
    'mediaPlan.days': '天',
    'mediaPlan.remove': '移除',

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

    // Filter dropdown options
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

    // Media Plan extra
    'mediaPlan.campaignEstimate': '活動預估',
    'mediaPlan.avgCpm': '平均 CPM',
    'mediaPlan.mediaPlanTotal': '媒體計畫總額',

    // Detail Card
    'detail.close': '關閉',
    'detail.description': '說明',
    'detail.specifications': '規格',

    // Exit
    'planner.exit': '離開企劃',

    // Common
    'common.langToggle': 'EN',
  }
};
