import { describe, expect, it } from "vitest";
import {
  NOTIFICATION_TYPES,
  notificationHref,
  buildNotificationMessage,
  type NotificationType,
} from "./notification-types";

describe("notification-types (NFR-005)", () => {
  describe("NOTIFICATION_TYPES", () => {
    it("필수 타입을 모두 포함한다", () => {
      expect(NOTIFICATION_TYPES).toContain("APPLICATION_CREATED");
      expect(NOTIFICATION_TYPES).toContain("APPLICATION_ACCEPTED");
      expect(NOTIFICATION_TYPES).toContain("APPLICATION_REJECTED");
      expect(NOTIFICATION_TYPES).toContain("APPLICATION_AUTO_REJECTED");
      expect(NOTIFICATION_TYPES).toContain("PROGRAM_CLOSED");
      expect(NOTIFICATION_TYPES).toContain("PAYMENT_COMPLETED");
      // SPEC-008 FR-002
      expect(NOTIFICATION_TYPES).toContain("REVIEW_REQUESTED");
    });
  });

  describe("notificationHref", () => {
    it("APPLICATION_CREATED는 크리에이터 대시보드 신청 목록으로 연결", () => {
      const result = notificationHref("APPLICATION_CREATED", {
        programId: "prog-1",
      });
      expect(result).toBe("/dashboard/creator/programs/prog-1/applications");
    });

    it("APPLICATION_ACCEPTED는 프로그램 신청 목록으로 연결", () => {
      const result = notificationHref("APPLICATION_ACCEPTED", {
        programId: "prog-1",
      });
      expect(result).toBe("/dashboard/creator/programs/prog-1/applications");
    });

    it("APPLICATION_REJECTED는 프로그램 신청 목록으로 연결", () => {
      const result = notificationHref("APPLICATION_REJECTED", {
        programId: "prog-1",
      });
      expect(result).toBe("/dashboard/creator/programs/prog-1/applications");
    });

    it("APPLICATION_AUTO_REJECTED는 프로그램 신청 목록으로 연결", () => {
      const result = notificationHref("APPLICATION_AUTO_REJECTED", {
        programId: "prog-1",
      });
      expect(result).toBe("/dashboard/creator/programs/prog-1/applications");
    });

    it("PROGRAM_CLOSED는 프로그램 신청 목록으로 연결", () => {
      const result = notificationHref("PROGRAM_CLOSED", {
        programId: "prog-1",
      });
      expect(result).toBe("/dashboard/creator/programs/prog-1/applications");
    });

    it("PAYMENT_COMPLETED는 계약 확인 페이지로 연결 (SPEC-006 FR-010)", () => {
      const result = notificationHref("PAYMENT_COMPLETED", {
        contractId: "contract-1",
      });
      expect(result).toBe("/contracts/contract-1");
    });

    it("PAYMENT_COMPLETED는 contractId가 없으면 null", () => {
      expect(notificationHref("PAYMENT_COMPLETED", {})).toBeNull();
    });

    it("REVIEW_REQUESTED는 프로그램 상세로 연결 (SPEC-008 FR-011)", () => {
      const result = notificationHref("REVIEW_REQUESTED", { programId: "prog-1" });
      expect(result).toBe("/programs/prog-1");
    });

    it("REVIEW_REQUESTED는 programId가 없으면 null", () => {
      expect(notificationHref("REVIEW_REQUESTED", {})).toBeNull();
    });

    it("programId가 없으면 null을 반환", () => {
      const result = notificationHref("APPLICATION_CREATED", {});
      expect(result).toBeNull();
    });

    it("모든 타입에 대해 programId 없으면 null", () => {
      NOTIFICATION_TYPES.forEach((type) => {
        const result = notificationHref(type as NotificationType, {});
        expect(result).toBeNull();
      });
    });
  });

  describe("buildNotificationMessage", () => {
    it("APPLICATION_CREATED 메시지 생성", () => {
      const result = buildNotificationMessage("APPLICATION_CREATED", {});
      expect(result).toBe("새로운 신청이 도착했습니다.");
    });

    it("APPLICATION_ACCEPTED 메시지 생성", () => {
      const result = buildNotificationMessage("APPLICATION_ACCEPTED", {});
      expect(result).toBe("신청이 수락되었습니다.");
    });

    it("APPLICATION_REJECTED 메시지 생성", () => {
      const result = buildNotificationMessage("APPLICATION_REJECTED", {});
      expect(result).toBe("신청이 거절되었습니다.");
    });

    it("APPLICATION_AUTO_REJECTED 메시지 생성", () => {
      const result = buildNotificationMessage("APPLICATION_AUTO_REJECTED", {});
      expect(result).toBe("다른 참여자가 선택되어 자동으로 거절되었습니다.");
    });

    it("PROGRAM_CLOSED 메시지 생성", () => {
      const result = buildNotificationMessage("PROGRAM_CLOSED", {});
      expect(result).toBe("프로그램 모집이 마감되었습니다.");
    });

    it("PAYMENT_COMPLETED 메시지 생성 (SPEC-006 FR-010)", () => {
      const result = buildNotificationMessage("PAYMENT_COMPLETED", {});
      expect(result).toBe("결제가 완료되었습니다.");
    });

    it("REVIEW_REQUESTED 메시지 생성 (SPEC-008 FR-002)", () => {
      const result = buildNotificationMessage("REVIEW_REQUESTED", {});
      expect(result).toBe("프로그램이 완료되었습니다. 리뷰를 작성해 보세요.");
    });
  });
});
