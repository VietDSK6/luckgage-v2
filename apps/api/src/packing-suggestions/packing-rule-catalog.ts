import type { PrismaClient } from '../generated/prisma/client.js';
import { ContentStatus, QuantityMode, TripType } from '../generated/prisma/enums.js';

const categories = {
  documents: ['Giấy tờ', 'Documents'],
  clothing: ['Quần áo', 'Clothing'],
  hygiene: ['Vệ sinh cá nhân', 'Toiletries'],
  essentials: ['Đồ thiết yếu', 'Essentials'],
  electronics: ['Thiết bị', 'Electronics'],
  outdoors: ['Ngoài trời', 'Outdoor gear'],
  beach: ['Đồ đi biển', 'Beach gear'],
  work: ['Công việc', 'Work'],
} as const;

type CategoryKey = keyof typeof categories;
type Item = {
  categoryKey: CategoryKey;
  categoryNameVi: string;
  categoryNameEn: string;
  itemKey: string;
  itemNameVi: string;
  itemNameEn: string;
  quantityMode: QuantityMode;
  baseQuantity: number;
  noteVi: string | null;
  noteEn: string | null;
  position: number;
};

type ItemSpec = readonly [CategoryKey, string, string, string, QuantityMode?, number?, string?, string?];

export type CuratedRule = {
  key: string;
  version: number;
  name: string;
  priority: number;
  reasonVi: string;
  reasonEn: string;
  tripType?: TripType;
  minDays?: number;
  minTempC?: number;
  maxTempC?: number;
  minRainPercent?: number;
  activityKey?: string;
  items: Item[];
};

function rule(
  key: string,
  name: string,
  priority: number,
  reasonVi: string,
  reasonEn: string,
  conditions: Partial<Pick<CuratedRule, 'tripType' | 'minDays' | 'minTempC' | 'maxTempC' | 'minRainPercent' | 'activityKey'>>,
  specs: ItemSpec[],
  version = 1,
): CuratedRule {
  return {
    key, name, priority, reasonVi, reasonEn, ...conditions, version,
    items: specs.map(([categoryKey, itemKey, itemNameVi, itemNameEn, quantityMode = QuantityMode.FIXED, baseQuantity = 1, noteVi, noteEn], position) => ({
      categoryKey,
      categoryNameVi: categories[categoryKey][0],
      categoryNameEn: categories[categoryKey][1],
      itemKey,
      itemNameVi,
      itemNameEn,
      quantityMode,
      baseQuantity,
      noteVi: noteVi ?? null,
      noteEn: noteEn ?? null,
      position,
    })),
  };
}

const perDay = QuantityMode.PER_DAY;

export const curatedPackingRules: CuratedRule[] = [
  rule('baseline-essentials', 'Đồ dùng cơ bản', 10, 'Cần cho mọi chuyến đi', 'For every trip', {}, [
    ['documents', 'identity-document', 'Giấy tờ tùy thân', 'Identity document'],
    ['essentials', 'wallet', 'Ví và phương tiện thanh toán', 'Wallet and payment method'],
    ['clothing', 'daily-outfit', 'Bộ quần áo', 'Outfit', perDay],
    ['clothing', 'underwear', 'Đồ lót', 'Underwear', perDay],
    ['clothing', 'socks', 'Đôi tất', 'Pair of socks', perDay],
    ['clothing', 'sleepwear', 'Đồ ngủ', 'Sleepwear'],
    ['hygiene', 'toothbrush', 'Bàn chải đánh răng', 'Toothbrush'],
    ['hygiene', 'toothpaste', 'Kem đánh răng', 'Toothpaste'],
    ['hygiene', 'deodorant', 'Lăn khử mùi', 'Deodorant'],
    ['hygiene', 'personal-care', 'Đồ chăm sóc cá nhân', 'Personal care items'],
    ['electronics', 'phone-charger', 'Sạc điện thoại', 'Phone charger'],
    ['essentials', 'personal-medication', 'Thuốc đang dùng', 'Regular medication', QuantityMode.FIXED, 1, 'Nếu có', 'If needed'],
  ], 2),
  rule('leisure-trip', 'Du lịch nghỉ ngơi', 20, 'Cho chuyến đi thư giãn', 'For a leisure trip', { tripType: TripType.LEISURE }, [
    ['essentials', 'day-bag', 'Túi dùng ban ngày', 'Day bag'],
    ['clothing', 'comfortable-shoes', 'Giày đi thoải mái', 'Comfortable shoes'],
    ['essentials', 'reusable-bottle', 'Bình nước', 'Reusable water bottle'],
  ]),
  rule('business-trip', 'Đi công tác', 20, 'Cho lịch công tác', 'For a business trip', { tripType: TripType.BUSINESS }, [
    ['work', 'work-outfit', 'Bộ đồ đi làm', 'Work outfit'],
    ['work', 'laptop', 'Máy tính làm việc', 'Work laptop'],
    ['work', 'laptop-charger', 'Sạc máy tính', 'Laptop charger'],
    ['work', 'meeting-notes', 'Tài liệu cuộc họp', 'Meeting notes'],
    ['work', 'business-card', 'Danh thiếp', 'Business cards', QuantityMode.FIXED, 1, 'Nếu cần', 'If needed'],
  ]),
  rule('camping-trip', 'Đi cắm trại', 20, 'Cho đêm ngoài trời', 'For a camping trip', { tripType: TripType.CAMPING }, [
    ['outdoors', 'tent', 'Lều', 'Tent'],
    ['outdoors', 'sleeping-bag', 'Túi ngủ', 'Sleeping bag'],
    ['outdoors', 'sleeping-mat', 'Tấm lót ngủ', 'Sleeping mat'],
    ['outdoors', 'headlamp', 'Đèn đội đầu', 'Headlamp'],
    ['outdoors', 'water-container', 'Bình đựng nước lớn', 'Large water container'],
    ['outdoors', 'first-aid-kit', 'Bộ sơ cứu', 'First aid kit'],
    ['outdoors', 'rubbish-bag', 'Túi đựng rác', 'Rubbish bag'],
  ]),
  rule('beach-trip', 'Đi biển', 20, 'Cho ngày ở biển', 'For a beach trip', { tripType: TripType.BEACH }, [
    ['beach', 'swimwear', 'Đồ bơi', 'Swimwear'],
    ['beach', 'beach-towel', 'Khăn đi biển', 'Beach towel'],
    ['beach', 'sandals', 'Dép', 'Sandals'],
    ['beach', 'sunscreen', 'Kem chống nắng', 'Sunscreen'],
    ['beach', 'sun-hat', 'Mũ che nắng', 'Sun hat'],
    ['beach', 'waterproof-pouch', 'Túi chống nước', 'Waterproof pouch'],
  ]),
  rule('hiking-trip', 'Đi trekking', 20, 'Cho đường đi bộ dài', 'For a long hike', { tripType: TripType.HIKING }, [
    ['outdoors', 'trail-shoes', 'Giày đi đường mòn', 'Trail shoes'],
    ['outdoors', 'daypack', 'Ba lô gọn', 'Daypack'],
    ['outdoors', 'water-bottle', 'Bình nước', 'Water bottle'],
    ['outdoors', 'first-aid-kit', 'Bộ sơ cứu', 'First aid kit'],
    ['outdoors', 'route-map', 'Bản đồ tuyến đường', 'Route map'],
    ['clothing', 'hiking-socks', 'Tất đi bộ đường dài', 'Hiking socks'],
  ]),
  rule('city-trip', 'Khám phá thành phố', 20, 'Cho ngày đi trong phố', 'For a city day', { tripType: TripType.CITY_TRIP }, [
    ['essentials', 'small-day-bag', 'Túi đeo gọn', 'Small day bag'],
    ['clothing', 'walking-shoes', 'Giày đi bộ', 'Walking shoes'],
    ['electronics', 'power-bank', 'Sạc dự phòng', 'Power bank'],
    ['essentials', 'transit-card', 'Thẻ đi lại', 'Transit card', QuantityMode.FIXED, 1, 'Nếu nơi đến sử dụng', 'If used at your destination'],
  ]),
  rule('road-trip', 'Đi đường bộ', 20, 'Cho quãng đường dài', 'For a long drive', { tripType: TripType.ROAD_TRIP }, [
    ['documents', 'driving-licence', 'Giấy phép lái xe', 'Driving licence', QuantityMode.FIXED, 1, 'Nếu bạn lái xe', 'If you drive'],
    ['essentials', 'car-water', 'Nước uống trên xe', 'Water for the road'],
    ['electronics', 'car-charger', 'Sạc trên xe', 'Car charger'],
    ['essentials', 'road-snacks', 'Đồ ăn nhẹ', 'Road snacks'],
    ['essentials', 'motion-sickness', 'Đồ chống say xe', 'Motion sickness aid', QuantityMode.FIXED, 1, 'Nếu cần', 'If needed'],
  ]),
  rule('international-trip', 'Đi nước ngoài', 20, 'Cho chuyến đi nước ngoài', 'For travel abroad', { tripType: TripType.INTERNATIONAL }, [
    ['documents', 'passport', 'Hộ chiếu', 'Passport'],
    ['documents', 'visa', 'Thị thực', 'Visa', QuantityMode.FIXED, 1, 'Nếu nơi đến yêu cầu', 'If required'],
    ['documents', 'travel-bookings', 'Thông tin đặt chỗ', 'Booking details'],
    ['documents', 'travel-insurance', 'Thông tin bảo hiểm du lịch', 'Travel insurance details', QuantityMode.FIXED, 1, 'Nếu có', 'If available'],
    ['electronics', 'plug-adapter', 'Đầu chuyển ổ cắm', 'Plug adapter', QuantityMode.FIXED, 1, 'Kiểm tra loại ổ cắm', 'Check the plug type'],
    ['essentials', 'local-payment', 'Cách thanh toán tại điểm đến', 'Destination payment method'],
  ]),
  rule('long-trip', 'Chuyến đi từ 5 ngày', 30, 'Cho chuyến đi nhiều ngày', 'For a longer trip', { minDays: 5 }, [
    ['clothing', 'laundry-bag', 'Túi đựng đồ bẩn', 'Laundry bag'],
    ['hygiene', 'travel-laundry', 'Đồ giặt gọn', 'Travel laundry supplies', QuantityMode.FIXED, 1, 'Nếu bạn dự định giặt đồ', 'If you plan to do laundry'],
  ]),
  rule('activity-swimming', 'Hoạt động bơi lội', 40, 'Cho buổi bơi', 'For swimming', { activityKey: 'swimming' }, [
    ['beach', 'swim-goggles', 'Kính bơi', 'Swim goggles'],
    ['beach', 'wet-clothes-bag', 'Túi đựng đồ ướt', 'Wet clothes bag'],
    ['beach', 'swim-cap', 'Mũ bơi', 'Swim cap', QuantityMode.FIXED, 1, 'Nếu hồ bơi yêu cầu', 'If the pool requires one'],
  ]),
  rule('activity-hiking', 'Hoạt động đi bộ đường dài', 40, 'Cho buổi đi bộ dài', 'For a long walk', { activityKey: 'hiking' }, [
    ['outdoors', 'trekking-poles', 'Gậy đi bộ', 'Trekking poles', QuantityMode.FIXED, 1, 'Nếu tuyến đường cần', 'If the route calls for them'],
    ['outdoors', 'trail-snacks', 'Đồ ăn nhẹ trên đường', 'Trail snacks'],
    ['outdoors', 'blister-plasters', 'Miếng dán phồng rộp', 'Blister plasters'],
  ]),
  rule('activity-camping', 'Hoạt động cắm trại', 40, 'Cho buổi cắm trại', 'For camping', { activityKey: 'camping' }, [
    ['outdoors', 'camp-cookware', 'Bộ nấu ăn dã ngoại', 'Camp cookware', QuantityMode.FIXED, 1, 'Nếu tự nấu', 'If cooking'],
    ['outdoors', 'camp-food', 'Đồ ăn cho buổi cắm trại', 'Camp food'],
    ['outdoors', 'insect-repellent', 'Kem chống côn trùng', 'Insect repellent'],
  ]),
  rule('activity-photography', 'Hoạt động chụp ảnh', 40, 'Cho buổi chụp ảnh', 'For photography', { activityKey: 'photography' }, [
    ['electronics', 'camera', 'Máy ảnh', 'Camera'],
    ['electronics', 'camera-battery', 'Pin máy ảnh', 'Camera battery'],
    ['electronics', 'memory-card', 'Thẻ nhớ', 'Memory card'],
  ]),
  rule('activity-workout', 'Hoạt động tập luyện', 40, 'Cho buổi tập', 'For a workout', { activityKey: 'workout' }, [
    ['clothing', 'workout-outfit', 'Đồ tập', 'Workout outfit'],
    ['clothing', 'training-shoes', 'Giày tập', 'Training shoes'],
    ['hygiene', 'small-towel', 'Khăn nhỏ', 'Small towel'],
  ]),
  rule('activity-formal', 'Sự kiện trang trọng', 40, 'Cho buổi gặp mặt', 'For a formal event', { activityKey: 'formal' }, [
    ['clothing', 'formal-outfit', 'Bộ đồ trang trọng', 'Formal outfit'],
    ['clothing', 'formal-shoes', 'Giày phù hợp', 'Formal shoes'],
    ['essentials', 'event-invitation', 'Thông tin sự kiện', 'Event details'],
  ]),
  rule('rainy-weather', 'Dự báo có mưa', 50, 'Dự báo có mưa', 'Rain is forecast', { minRainPercent: 60 }, [
    ['outdoors', 'compact-umbrella', 'Ô gấp', 'Compact umbrella'],
    ['clothing', 'rain-jacket', 'Áo mưa', 'Rain jacket'],
    ['essentials', 'dry-bag', 'Túi giữ đồ khô', 'Dry bag'],
  ]),
  rule('cold-weather', 'Thời tiết lạnh', 50, 'Dự báo trời lạnh', 'Cold weather is forecast', { maxTempC: 15 }, [
    ['clothing', 'warm-jacket', 'Áo khoác ấm', 'Warm jacket'],
    ['clothing', 'warm-layer', 'Áo mặc nhiều lớp', 'Warm layer'],
    ['clothing', 'warm-scarf', 'Khăn choàng', 'Scarf'],
  ]),
  rule('hot-weather', 'Thời tiết nóng', 50, 'Dự báo trời nóng', 'Hot weather is forecast', { minTempC: 32 }, [
    ['clothing', 'light-clothing', 'Quần áo thoáng mát', 'Light clothing'],
    ['essentials', 'sun-glasses', 'Kính râm', 'Sunglasses'],
    ['hygiene', 'sun-protection', 'Kem chống nắng', 'Sunscreen'],
  ]),
];

/** Create immutable catalog revisions; leave any admin edits to existing revisions intact. */
export async function seedCuratedPackingRules(prisma: PrismaClient): Promise<{ created: number; existing: number }> {
  return prisma.$transaction(async (tx) => {
    await tx.packingRule.updateMany({
      where: { key: 'baseline-essentials', version: 1, status: ContentStatus.PUBLISHED },
      data: { status: ContentStatus.ARCHIVED },
    });
    let created = 0;
    let existing = 0;
    for (const entry of curatedPackingRules) {
      const found = await tx.packingRule.findUnique({ where: { key_version: { key: entry.key, version: entry.version } }, select: { id: true } });
      if (found) {
        existing += 1;
        continue;
      }
      const { items, ...fields } = entry;
      await tx.packingRule.create({
        data: {
          ...fields,
          status: ContentStatus.PUBLISHED,
          publishedAt: new Date(),
          items: { create: items },
        },
      });
      created += 1;
    }
    return { created, existing };
  });
}
