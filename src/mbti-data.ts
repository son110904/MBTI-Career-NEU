/** Trục MBTI: E-I, S-N, T-F, J-P */
export type Dimension = "E_I" | "S_N" | "T_F" | "J_P";

export interface MBTIQuestion {
  id: string;
  dimension: Dimension;
  /**
   * chiều được cộng khi người dùng chấm điểm cao hơn trung tính (4) trên thang 1‑7
   */
  agree: "E" | "I" | "S" | "N" | "T" | "F" | "J" | "P";
  /**
   * chiều còn lại, cộng khi người dùng chấm điểm 1‑3
   */
  disagree: "E" | "I" | "S" | "N" | "T" | "F" | "J" | "P";
  /** tuyên ngôn để người dùng đánh giá với thang Likert 7 mức */
  text: string;
}

/** 20 tuyên ngôn định hướng 4 chiều MBTI */
export const MBTI_QUESTIONS: MBTIQuestion[] = [
  // E - I
  {
    id: "ei1",
    dimension: "E_I",
    agree: "I",
    disagree: "E",
    text: "Bạn thường không thích trở thành tâm điểm chú ý.",
  },
  {
    id: "ei2",
    dimension: "E_I",
    agree: "E",
    disagree: "I",
    text: "Bạn thích tham gia các hoạt động nhóm.",
  },
  {
    id: "ei3",
    dimension: "E_I",
    agree: "E",
    disagree: "I",
    text: "Trong nhóm bạn, bạn thường là người chủ động liên lạc và rủ mọi người cùng làm việc gì đó.",
  },
  {
    id: "ei4",
    dimension: "E_I",
    agree: "E",
    disagree: "I",
    text: "Sau một tuần dài mệt mỏi, bạn muốn đi gặp gỡ và tụ tập với mọi người.",
  },
  {
    id: "ei5",
    dimension: "E_I",
    agree: "I",
    disagree: "E",
    text: "Bạn thường ngại hoặc tránh gọi điện thoại.",
  },
  // S - N
  {
    id: "sn1",
    dimension: "S_N",
    agree: "N",
    disagree: "S",
    text: "Bạn thích những cuốn sách hoặc bộ phim có kết thúc mở để người xem tự suy nghĩ và diễn giải.",
  },
  {
    id: "sn2",
    dimension: "S_N",
    agree: "N",
    disagree: "S",
    text: "Bạn thấy mình hứng thú với quá nhiều thứ nên đôi khi khó chọn nên thử điều gì tiếp theo.",
  },
  {
    id: "sn3",
    dimension: "S_N",
    agree: "N",
    disagree: "S",
    text: "Bạn thường dành nhiều thời gian để tìm hiểu những quan điểm rất khác với mình.",
  },
  {
    id: "sn4",
    dimension: "S_N",
    agree: "S",
    disagree: "N",
    text: "Bạn không hứng thú lắm với việc bàn luận các cách hiểu khác nhau về sách, phim hay tác phẩm nghệ thuật.",
  },
  {
    id: "sn5",
    dimension: "S_N",
    agree: "S",
    disagree: "N",
    text: "Bạn không phải kiểu người có thiên hướng nghệ thuật.",
  },
  // T - F
  {
    id: "tf1",
    dimension: "T_F",
    agree: "T",
    disagree: "F",
    text: "Bạn thường quyết định dựa vào lý trí hơn là cảm xúc.",
  },
  {
    id: "tf2",
    dimension: "T_F",
    agree: "F",
    disagree: "T",
    text: "Bạn cảm thấy vui khi giúp người khác đạt được mục tiêu, đôi khi còn hơn cả khi mình tự đạt được.",
  },
  {
    id: "tf3",
    dimension: "T_F",
    agree: "T",
    disagree: "F",
    text: "Bạn thường khó hiểu được cảm xúc của người khác.",
  },
  {
    id: "tf4",
    dimension: "T_F",
    agree: "F",
    disagree: "T",
    text: "Khi thấy người khác khóc, bạn cũng dễ xúc động theo.",
  },
  {
    id: "tf5",
    dimension: "T_F",
    agree: "F",
    disagree: "T",
    text: "Bạn dễ đồng cảm với người có trải nghiệm sống rất khác mình.",
  },
  // J - P
  {
    id: "jp1",
    dimension: "J_P",
    agree: "P",
    disagree: "J",
    text: "Bạn thích làm theo cảm hứng hơn là lên kế hoạch cụ thể cho một ngày.",
  },
  {
    id: "jp2",
    dimension: "J_P",
    agree: "P",
    disagree: "J",
    text: "Bạn thường gặp khó khăn khi phải làm việc theo deadline.",
  },
  {
    id: "jp3",
    dimension: "J_P",
    agree: "P",
    disagree: "J",
    text: "Bạn hay để mọi việc đến sát giờ mới làm.",
  },
  {
    id: "jp4",
    dimension: "J_P",
    agree: "J",
    disagree: "P",
    text: "Bạn thích có danh sách việc cần làm mỗi ngày.",
  },
  {
    id: "jp5",
    dimension: "J_P",
    agree: "J",
    disagree: "P",
    text: "Bạn thích dùng lịch hoặc danh sách để sắp xếp công việc.",
  },
];

export type MBTIType =
  | "INTJ" | "INTP" | "ENTJ" | "ENTP"
  | "INFJ" | "INFP" | "ENFJ" | "ENFP"
  | "ISTJ" | "ISFJ" | "ESTJ" | "ESFJ"
  | "ISTP" | "ISFP" | "ESTP" | "ESFP";

export interface MBTITypeInfo {
  type: MBTIType;
  nameVi: string;
  shortDesc: string;
  /** Gợi ý nghề phù hợp với sinh viên kinh tế NEU */
  careers: string[];
  /** Ngành/ chuyên ngành NEU gợi ý */
  neuMajors: string[];
  traits: string[];
}

/** 16 nhóm MBTI – mô tả và định hướng nghề cho sinh viên kinh tế */
export const MBTI_TYPE_INFO: Record<MBTIType, MBTITypeInfo> = {
  INTJ: {
    type: "INTJ",
    nameVi: "Nhà chiến lược",
    shortDesc: "Suy nghĩ độc lập, có tầm nhìn, thích kế hoạch dài hạn và phân tích hệ thống.",
    careers: [
      "Chiến lược gia / Tư vấn chiến lược doanh nghiệp",
      "Phân tích tài chính / Đầu tư",
      "Quản trị rủi ro",
      "Nghiên cứu kinh tế / Chính sách",
      "Khởi nghiệp (founder có tầm nhìn)",
    ],
    neuMajors: ["Kinh tế học", "Quản trị kinh doanh", "Tài chính – Ngân hàng", "Kinh tế quốc tế"],
    traits: ["Logic", "Độc lập", "Có tầm nhìn", "Quyết đoán", "Hướng mục tiêu"],
  },
  INTP: {
    type: "INTP",
    nameVi: "Nhà tư duy",
    shortDesc: "Ham phân tích, thích mô hình và lý thuyết, tìm tòi giải pháp sáng tạo.",
    careers: [
      "Phân tích dữ liệu / Data analyst",
      "Nghiên cứu kinh tế lượng",
      "Tư vấn công nghệ & chuyển đổi số",
      "Giảng dạy & nghiên cứu",
      "Tư vấn thuế / Kế toán chuyên sâu",
    ],
    neuMajors: ["Kinh tế học", "Kế toán", "Hệ thống thông tin quản lý", "Toán kinh tế"],
    traits: ["Phân tích", "Sáng tạo", "Độc lập", "Tò mò", "Khách quan"],
  },
  ENTJ: {
    type: "ENTJ",
    nameVi: "Nhà điều hành",
    shortDesc: "Bản lĩnh lãnh đạo, quyết đoán, thích dẫn dắt và đạt mục tiêu rõ ràng.",
    careers: [
      "Quản lý cấp cao / Giám đốc điều hành",
      "Tư vấn quản lý (McKinsey, BCG style)",
      "Ngân hàng đầu tư / M&A",
      "Khởi nghiệp / Quản lý dự án lớn",
      "Chính sách công / Lãnh đạo tổ chức",
    ],
    neuMajors: ["Quản trị kinh doanh", "Tài chính – Ngân hàng", "Kinh tế quốc tế", "Luật kinh tế"],
    traits: ["Lãnh đạo", "Quyết đoán", "Chiến lược", "Năng động", "Cạnh tranh"],
  },
  ENTP: {
    type: "ENTP",
    nameVi: "Nhà sáng tạo",
    shortDesc: "Nhanh nhạy, thích tranh luận ý tưởng, khởi nghiệp và đổi mới.",
    careers: [
      "Khởi nghiệp / Startup",
      "Tư vấn đổi mới & chiến lược",
      "Marketing / Growth hacking",
      "Đàm phán thương mại quốc tế",
      "Truyền thông & PR",
    ],
    neuMajors: ["Marketing", "Quản trị kinh doanh", "Kinh tế quốc tế", "Thương mại điện tử"],
    traits: ["Sáng tạo", "Linh hoạt", "Thích thử thách", "Giao tiếp tốt", "Tranh luận"],
  },
  INFJ: {
    type: "INFJ",
    nameVi: "Người hướng dẫn",
    shortDesc: "Có giá trị rõ ràng, muốn tạo tác động tích cực, phù hợp vai trò tư vấn và phát triển con người.",
    careers: [
      "Tư vấn nhân sự / Phát triển tổ chức",
      "CSR / Phát triển bền vững",
      "Tư vấn hướng nghiệp / Giáo dục",
      "Nghiên cứu xã hội & chính sách",
      "Quản lý dự án phi lợi nhuận hoặc giáo dục",
    ],
    neuMajors: ["Quản trị nhân lực", "Kinh tế phát triển", "Kinh tế học", "Quản trị kinh doanh"],
    traits: ["Đồng cảm", "Có tầm nhìn", "Nguyên tắc", "Hỗ trợ", "Kiên định"],
  },
  INFP: {
    type: "INFP",
    nameVi: "Người lý tưởng",
    shortDesc: "Trung thành với giá trị cá nhân, thích công việc có ý nghĩa và sáng tạo.",
    careers: [
      "Content / Copywriting & Truyền thông có chiều sâu",
      "Tư vấn hướng nghiệp / Tâm lý học ứng dụng",
      "CSR / Marketing vì cộng đồng",
      "Nghiên cứu định tính / Thị trường",
      "Nghệ thuật quản lý / Văn hóa doanh nghiệp",
    ],
    neuMajors: ["Marketing", "Quản trị nhân lực", "Kinh tế phát triển", "Báo chí – Truyền thông"],
    traits: ["Sáng tạo", "Đồng cảm", "Lý tưởng", "Linh hoạt", "Trung thành"],
  },
  ENFJ: {
    type: "ENFJ",
    nameVi: "Người dẫn dắt",
    shortDesc: "Tự nhiên lãnh đạo bằng sự đồng cảm, thích đào tạo và phát triển đội ngũ.",
    careers: [
      "Quản lý nhân sự / Đào tạo & Phát triển",
      "Tư vấn quản lý (phần con người & thay đổi)",
      "Quan hệ công chúng / Đối ngoại",
      "Giảng dạy / Đào tạo doanh nghiệp",
      "Quản lý dự án với nhiều bên liên quan",
    ],
    neuMajors: ["Quản trị nhân lực", "Quản trị kinh doanh", "Marketing", "Kinh tế quốc tế"],
    traits: ["Lãnh đạo", "Đồng cảm", "Truyền cảm hứng", "Tổ chức", "Trách nhiệm"],
  },
  ENFP: {
    type: "ENFP",
    nameVi: "Người truyền cảm hứng",
    shortDesc: "Nhiệt huyết, kết nối con người và ý tưởng, phù hợp marketing và sáng tạo.",
    careers: [
      "Marketing / Brand management",
      "Tư vấn / Bán hàng B2B cao cấp",
      "Sự kiện / Truyền thông",
      "Khởi nghiệp / Đối tác kinh doanh",
      "Đào tạo & Huấn luyện",
    ],
    neuMajors: ["Marketing", "Quản trị kinh doanh", "Kinh tế quốc tế", "Thương mại điện tử"],
    traits: ["Nhiệt huyết", "Sáng tạo", "Giao tiếp", "Linh hoạt", "Truyền cảm hứng"],
  },
  ISTJ: {
    type: "ISTJ",
    nameVi: "Người đáng tin cậy",
    shortDesc: "Tận tâm, tuân thủ quy trình, phù hợp kế toán, kiểm toán và vận hành ổn định.",
    careers: [
      "Kế toán / Kiểm toán",
      "Tài chính doanh nghiệp / Kế toán trưởng",
      "Quản lý vận hành / Hành chính",
      "Tuân thủ / Compliance",
      "Phân tích tài chính định lượng",
    ],
    neuMajors: ["Kế toán", "Kiểm toán", "Tài chính – Ngân hàng", "Quản trị kinh doanh"],
    traits: ["Đáng tin", "Chi tiết", "Trách nhiệm", "Ổn định", "Quy trình"],
  },
  ISFJ: {
    type: "ISFJ",
    nameVi: "Người hỗ trợ",
    shortDesc: "Chu đáo, hỗ trợ đồng nghiệp và khách hàng, phù hợp hành chính nhân sự và chăm sóc khách hàng.",
    careers: [
      "Hành chính nhân sự / Chăm sóc nhân viên",
      "Kế toán / Giao dịch viên ngân hàng",
      "Chăm sóc khách hàng cao cấp",
      "Quản lý văn phòng / Điều phối",
      "Tuân thủ & Đạo đức kinh doanh",
    ],
    neuMajors: ["Kế toán", "Quản trị nhân lực", "Tài chính – Ngân hàng", "Bảo hiểm"],
    traits: ["Chu đáo", "Trung thành", "Hỗ trợ", "Chi tiết", "Ổn định"],
  },
  ESTJ: {
    type: "ESTJ",
    nameVi: "Người tổ chức",
    shortDesc: "Thích quản lý, đảm bảo quy trình và hiệu quả, phù hợp điều hành và quản lý dự án.",
    careers: [
      "Quản lý điều hành / Giám đốc vận hành",
      "Quản lý dự án (PMO)",
      "Kế toán trưởng / Kiểm soát nội bộ",
      "Tư vấn quản lý (triển khai quy trình)",
      "Ngân hàng / Tín dụng & quản lý rủi ro",
    ],
    neuMajors: ["Quản trị kinh doanh", "Kế toán", "Tài chính – Ngân hàng", "Hệ thống thông tin quản lý"],
    traits: ["Tổ chức", "Quyết đoán", "Thực tế", "Trách nhiệm", "Rõ ràng"],
  },
  ESFJ: {
    type: "ESFJ",
    nameVi: "Người kết nối",
    shortDesc: "Hòa đồng, chăm sóc mọi người, phù hợp nhân sự, quan hệ khách hàng và sự kiện.",
    careers: [
      "Quản trị nhân sự / Tuyển dụng",
      "Quan hệ khách hàng / Account management",
      "Tổ chức sự kiện / Hành chính",
      "Bán hàng / Chăm sóc khách hàng doanh nghiệp",
      "Đào tạo nội bộ",
    ],
    neuMajors: ["Quản trị nhân lực", "Marketing", "Quản trị kinh doanh", "Kinh tế quốc tế"],
    traits: ["Hòa đồng", "Chăm sóc", "Trách nhiệm", "Hợp tác", "Thực tế"],
  },
  ISTP: {
    type: "ISTP",
    nameVi: "Người thực thi",
    shortDesc: "Thích giải quyết vấn đề kỹ thuật và vận hành, phân tích số liệu thực tế.",
    careers: [
      "Phân tích định lượng / Risk analytics",
      "Vận hành giao dịch / Trading support",
      "Tư vấn công nghệ / Triển khai hệ thống",
      "Kiểm toán nội bộ / Forensic",
      "Quản lý chuỗi cung ứng / Vận hành",
    ],
    neuMajors: ["Tài chính – Ngân hàng", "Kế toán", "Hệ thống thông tin quản lý", "Toán kinh tế"],
    traits: ["Thực tế", "Phân tích", "Linh hoạt", "Bình tĩnh", "Kỹ thuật"],
  },
  ISFP: {
    type: "ISFP",
    nameVi: "Người sáng tạo thực tế",
    shortDesc: "Tôn trọng giá trị, thích công việc có tính thẩm mỹ hoặc hỗ trợ người khác trong bối cảnh cụ thể.",
    careers: [
      "Content / Thiết kế trải nghiệm thương hiệu",
      "Chăm sóc khách hàng / Hỗ trợ khách hàng cao cấp",
      "Marketing sáng tạo / Social media",
      "Nhân sự (phần phúc lợi, văn hóa)",
      "Nghiên cứu thị trường định tính",
    ],
    neuMajors: ["Marketing", "Quản trị nhân lực", "Kinh tế", "Thương mại điện tử"],
    traits: ["Sáng tạo", "Linh hoạt", "Đồng cảm", "Thực tế", "Trung thành"],
  },
  ESTP: {
    type: "ESTP",
    nameVi: "Người hành động",
    shortDesc: "Nhanh nhạy, thích môi trường năng động, đàm phán và kinh doanh trực tiếp.",
    careers: [
      "Bán hàng / Kinh doanh B2B",
      "Đàm phán / M&A / Giao dịch",
      "Khởi nghiệp / Kinh doanh thực chiến",
      "Quản lý rủi ro / Tuân thủ thực thi",
      "Tư vấn triển khai / Triển khai dự án",
    ],
    neuMajors: ["Marketing", "Quản trị kinh doanh", "Tài chính – Ngân hàng", "Kinh tế quốc tế"],
    traits: ["Hành động", "Linh hoạt", "Thực tế", "Tự tin", "Năng động"],
  },
  ESFP: {
    type: "ESFP",
    nameVi: "Người nhiệt huyết",
    shortDesc: "Thích làm việc với con người, sự kiện và môi trường năng động.",
    careers: [
      "Tổ chức sự kiện / Truyền thông",
      "Bán hàng / Quan hệ khách hàng",
      "Marketing / Brand activation",
      "Tuyển dụng / Employer branding",
      "Giải trí / Du lịch & Khách sạn (quản lý)",
    ],
    neuMajors: ["Marketing", "Quản trị kinh doanh", "Kinh tế quốc tế", "Quản trị nhân lực"],
    traits: ["Nhiệt tình", "Hòa đồng", "Linh hoạt", "Thực tế", "Quan tâm"],
  },
};
