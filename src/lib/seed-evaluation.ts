import { auth, db } from './firebase';
import { collection, getDocs, addDoc, query, limit, serverTimestamp } from 'firebase/firestore';

export const seedEvaluationData = async () => {
  try {
    if (!auth.currentUser) return;
    const authorUid = auth.currentUser.uid;

    const criteriaRef = collection(db, 'evaluation_criteria');
    const criteriaSnap = await getDocs(query(criteriaRef, limit(1)));
    
    if (criteriaSnap.empty) {
      const defaultCriteria = [
        { name: 'Chấp hành kỷ luật, kỷ cương', weight: 15, group: 1, description: 'Đánh giá việc chấp hành giờ giấc, nội quy cơ quan, quy định của Đảng và Nhà nước.' },
        { name: 'Chất lượng tham mưu văn bản', weight: 25, group: 2, description: 'Đánh giá độ chính xác, kịp thời, tính logic và đúng quy định của văn bản tham mưu.' },
        { name: 'Tiến độ hoàn thành nhiệm vụ', weight: 25, group: 2, description: 'Đánh giá việc hoàn thành các nhiệm vụ được giao theo kế hoạch và đột xuất.' },
        { name: 'Phối hợp công tác', weight: 15, group: 2, description: 'Đánh giá khả năng phối hợp với đồng nghiệp và các đơn vị liên quan.' },
        { name: 'Sáng kiến, cải tiến công việc', weight: 10, group: 3, description: 'Đánh giá các đóng góp mới, sáng tạo, ứng dụng công nghệ thông tin.' },
        { name: 'Tư tưởng chính trị, đạo đức', weight: 10, group: 1, description: 'Đánh giá lập trường tư tưởng, lối sống, đạo đức công vụ.' }
      ];
      
      try {
        for (const c of defaultCriteria) {
          await addDoc(criteriaRef, c);
        }
        console.log('Seeded evaluation criteria');
      } catch (e) { console.warn('Could not seed evaluation criteria', e); }
    }

    const periodRef = collection(db, 'evaluation_periods');
    const periodSnap = await getDocs(query(periodRef, limit(1)));
    
    if (periodSnap.empty) {
      try {
        await addDoc(periodRef, {
          name: 'Tháng 03/2026',
          startDate: '2026-03-01',
          endDate: '2026-03-31',
          status: 'open'
        });
        console.log('Seeded evaluation period');
      } catch (e) { console.warn('Could not seed evaluation periods', e); }
    }

    const officersRef = collection(db, 'officers');
    const officersSnap = await getDocs(query(officersRef, limit(1)));
    
    if (officersSnap.empty) {
      const defaultOfficers = [
        { fullName: 'Nguyễn Văn A', name: 'Nguyễn Văn A', unitId: 'VP', role: 'specialist', position: 'Chuyên viên chính', status: 'active', authorUid, createdAt: serverTimestamp() },
        { fullName: 'Trần Thị B', name: 'Trần Thị B', unitId: 'VP', role: 'staff', position: 'Nhân viên hành chính', status: 'active', authorUid, createdAt: serverTimestamp() },
        { fullName: 'Lê Văn C', name: 'Lê Văn C', unitId: 'TC', role: 'specialist', position: 'Chuyên viên tài chính', status: 'active', authorUid, createdAt: serverTimestamp() },
        { fullName: 'Phạm Minh D', name: 'Phạm Minh D', unitId: 'VP', role: 'leader', position: 'Trưởng phòng', status: 'active', authorUid, createdAt: serverTimestamp() },
        { fullName: 'Hoàng Thị E', name: 'Hoàng Thị E', unitId: 'TC', role: 'leader', position: 'Phó phòng', status: 'active', authorUid, createdAt: serverTimestamp() }
      ];
      
      try {
        for (const p of defaultOfficers) {
          await addDoc(officersRef, p);
        }
        console.log('Seeded officers');
      } catch (e) { console.warn('Could not seed officers', e); }
    }
  } catch (error) {
    console.warn('Error fetching or seeding evaluation data:', error);
  }
};
