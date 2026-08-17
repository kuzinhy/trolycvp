import { Lunar, Solar } from 'lunar-javascript';

export interface HolidayInfo {
  name: string;
  isDayOff: boolean;
}

export function getLunarDate(date: Date) {
  const solar = Solar.fromDate(date);
  const lunar = solar.getLunar();
  return {
    day: lunar.getDay(),
    month: lunar.getMonth(),
    year: lunar.getYear(),
    isLeap: lunar.getMonth() < 0 // lunar-javascript uses negative month for leap month
  };
}

export function getHolidays(date: Date): HolidayInfo[] {
  const holidays: HolidayInfo[] = [];
  const solar = Solar.fromDate(date);
  const lunar = solar.getLunar();

  const sDay = solar.getDay();
  const sMonth = solar.getMonth();
  const lDay = lunar.getDay();
  const lMonth = Math.abs(lunar.getMonth());

  // Solar Holidays
  if (sDay === 1 && sMonth === 1) holidays.push({ name: 'Tết Dương lịch', isDayOff: true });
  if (sDay === 14 && sMonth === 2) holidays.push({ name: 'Lễ Tình nhân (Valentine)', isDayOff: false });
  if (sDay === 8 && sMonth === 3) holidays.push({ name: 'Quốc tế Phụ nữ', isDayOff: false });
  if (sDay === 30 && sMonth === 4) holidays.push({ name: 'Giải phóng miền Nam', isDayOff: true });
  if (sDay === 1 && sMonth === 5) holidays.push({ name: 'Quốc tế Lao động', isDayOff: true });
  if (sDay === 1 && sMonth === 6) holidays.push({ name: 'Quốc tế Thiếu nhi', isDayOff: false });
  if (sDay === 2 && sMonth === 9) holidays.push({ name: 'Quốc khánh', isDayOff: true });
  if (sDay === 20 && sMonth === 10) holidays.push({ name: 'Phụ nữ Việt Nam', isDayOff: false });
  if (sDay === 20 && sMonth === 11) holidays.push({ name: 'Nhà giáo Việt Nam', isDayOff: false });
  if (sDay === 22 && sMonth === 12) holidays.push({ name: 'Thành lập QĐND Việt Nam', isDayOff: false });
  if (sDay === 24 && sMonth === 12) holidays.push({ name: 'Lễ Giáng sinh', isDayOff: false });

  // Lunar Holidays
  if (lDay === 1 && lMonth === 1) holidays.push({ name: 'Mùng 1 Tết Nguyên Đán', isDayOff: true });
  if (lDay === 2 && lMonth === 1) holidays.push({ name: 'Mùng 2 Tết Nguyên Đán', isDayOff: true });
  if (lDay === 3 && lMonth === 1) holidays.push({ name: 'Mùng 3 Tết Nguyên Đán', isDayOff: true });
  if (lDay === 4 && lMonth === 1) holidays.push({ name: 'Mùng 4 Tết Nguyên Đán', isDayOff: true });
  if (lDay === 5 && lMonth === 1) holidays.push({ name: 'Mùng 5 Tết Nguyên Đán', isDayOff: true });
  if (lDay === 15 && lMonth === 1) holidays.push({ name: 'Tết Nguyên Tiêu', isDayOff: false });
  if (lDay === 10 && lMonth === 3) holidays.push({ name: 'Giỗ Tổ Hùng Vương', isDayOff: true });
  if (lDay === 15 && lMonth === 4) holidays.push({ name: 'Lễ Phật Đản', isDayOff: false });
  if (lDay === 5 && lMonth === 5) holidays.push({ name: 'Tết Đoan Ngọ', isDayOff: false });
  if (lDay === 15 && lMonth === 7) holidays.push({ name: 'Lễ Vu Lan', isDayOff: false });
  if (lDay === 15 && lMonth === 8) holidays.push({ name: 'Tết Trung Thu', isDayOff: false });
  if (lDay === 23 && lMonth === 12) holidays.push({ name: 'Ông Táo chầu trời', isDayOff: false });

  // Check for Lunar New Year's Eve (Ngày 30 Tết hoặc 29 Tết nếu tháng thiếu)
  const tomorrow = new Date(date);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowLunar = Solar.fromDate(tomorrow).getLunar();
  if (tomorrowLunar.getDay() === 1 && Math.abs(tomorrowLunar.getMonth()) === 1) {
    holidays.push({ name: 'Giao thừa', isDayOff: true });
  }
  
  const dayAfterTomorrow = new Date(date);
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
  const dayAfterTomorrowLunar = Solar.fromDate(dayAfterTomorrow).getLunar();
  if (dayAfterTomorrowLunar.getDay() === 1 && Math.abs(dayAfterTomorrowLunar.getMonth()) === 1) {
    holidays.push({ name: '29 Tết', isDayOff: true });
  }

  // Compensatory days off (Nghỉ bù)
  // If a holiday falls on Saturday or Sunday, the next Monday (or Tuesday) is a day off.
  const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, 2 = Tuesday
  
  const isOfficialHoliday = (d: Date) => {
    const s = Solar.fromDate(d);
    const l = s.getLunar();
    const sd = s.getDay(), sm = s.getMonth();
    const ld = l.getDay(), lm = Math.abs(l.getMonth());
    
    if (sd === 1 && sm === 1) return true;
    if (sd === 30 && sm === 4) return true;
    if (sd === 1 && sm === 5) return true;
    if (sd === 2 && sm === 9) return true;
    if (ld === 10 && lm === 3) return true;
    // Lunar New Year is 5 days, usually weekends are compensated
    if (lm === 1 && ld >= 1 && ld <= 5) return true;
    
    // Giao thừa / 29 Tết
    const tomorrow = new Date(d);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowL = Solar.fromDate(tomorrow).getLunar();
    if (tomorrowL.getDay() === 1 && Math.abs(tomorrowL.getMonth()) === 1) return true;
    
    const dayAfter = new Date(d);
    dayAfter.setDate(dayAfter.getDate() + 2);
    const dayAfterL = Solar.fromDate(dayAfter).getLunar();
    if (dayAfterL.getDay() === 1 && Math.abs(dayAfterL.getMonth()) === 1) return true;

    return false;
  };

  if (dayOfWeek === 1) { // Monday
    const sunday = new Date(date); sunday.setDate(sunday.getDate() - 1);
    const saturday = new Date(date); saturday.setDate(saturday.getDate() - 2);
    
    if (isOfficialHoliday(sunday) || isOfficialHoliday(saturday)) {
      holidays.push({ name: 'Nghỉ bù', isDayOff: true });
    }
  } else if (dayOfWeek === 2) { // Tuesday
    const sunday = new Date(date); sunday.setDate(sunday.getDate() - 2);
    const saturday = new Date(date); saturday.setDate(saturday.getDate() - 3);
    const monday = new Date(date); monday.setDate(monday.getDate() - 1);
    
    // If both Saturday and Sunday were holidays, Tuesday is off
    if (isOfficialHoliday(saturday) && isOfficialHoliday(sunday)) {
      holidays.push({ name: 'Nghỉ bù', isDayOff: true });
    }
    // Or if Sunday and Monday were holidays (e.g. 30/4 is Sun, 1/5 is Mon -> Tue is off)
    else if (isOfficialHoliday(sunday) && isOfficialHoliday(monday)) {
      holidays.push({ name: 'Nghỉ bù', isDayOff: true });
    }
  } else if (dayOfWeek === 3) { // Wednesday
    const saturday = new Date(date); saturday.setDate(saturday.getDate() - 4);
    const sunday = new Date(date); sunday.setDate(sunday.getDate() - 3);
    const monday = new Date(date); monday.setDate(monday.getDate() - 2);
    const tuesday = new Date(date); tuesday.setDate(tuesday.getDate() - 1);
    
    // If Sat, Sun, Mon, Tue were holidays (e.g. Lunar New Year)
    if (isOfficialHoliday(sunday) && isOfficialHoliday(monday) && isOfficialHoliday(tuesday)) {
       holidays.push({ name: 'Nghỉ bù', isDayOff: true });
    }
  }

  return holidays;
}
