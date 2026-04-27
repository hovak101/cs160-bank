import {
  getAccountTypeLabel,
  isCreditAccount,
  isDepositEligible,
} from "@/lib/banking/rules";

export type AtmAction = "withdraw" | "deposit";

export type DemoAtmLocation = {
  atm_id: string;
  name: string;
  address_line: string;
  city: string;
  state: string;
  zip: string;
  hours: string;
};

export type AtmLocationSelection = {
  atm_id: string;
  name: string;
  location: string;
  hours?: string;
  distance?: string;
  lat?: number;
  lng?: number;
  source?: "demo" | "search";
};

export const DEMO_ATM_LOCATIONS: DemoAtmLocation[] = [
  {
    atm_id: "vitality-downtown-sf",
    name: "Vitality Downtown ATM",
    address_line: "100 Market St",
    city: "San Francisco",
    state: "CA",
    zip: "94105",
    hours: "Open 24 hours",
  },
  {
    atm_id: "vitality-union-square",
    name: "Union Square ATM",
    address_line: "333 Powell St",
    city: "San Francisco",
    state: "CA",
    zip: "94102",
    hours: "6:00 AM - 11:00 PM",
  },
  {
    atm_id: "vitality-oakland-lakeside",
    name: "Lakeside ATM",
    address_line: "210 Grand Ave",
    city: "Oakland",
    state: "CA",
    zip: "94612",
    hours: "Open 24 hours",
  },
  {
    atm_id: "vitality-berkeley-campus",
    name: "Campus ATM",
    address_line: "2450 Bancroft Way",
    city: "Berkeley",
    state: "CA",
    zip: "94704",
    hours: "7:00 AM - 10:00 PM",
  },
];

export function getDemoAtmLocation(atmId: string) {
  return DEMO_ATM_LOCATIONS.find((atm) => atm.atm_id === atmId) ?? null;
}

export function formatAtmLocation(
  atm: Pick<DemoAtmLocation, "address_line" | "city" | "state" | "zip">
) {
  return `${atm.address_line}, ${atm.city}, ${atm.state} ${atm.zip}`;
}

export function formatAtmLabel(atm: DemoAtmLocation) {
  return `${atm.name} - ${formatAtmLocation(atm)}`;
}

export function mapDemoAtmToSelection(atm: DemoAtmLocation): AtmLocationSelection {
  return {
    atm_id: atm.atm_id,
    name: atm.name,
    location: formatAtmLocation(atm),
    hours: atm.hours,
    source: "demo",
  };
}

export function buildAtmTransactionDescription(
  action: AtmAction,
  atm: Pick<AtmLocationSelection, "name" | "location">,
  status: "pending" | "completed"
) {
  const prefix =
    action === "withdraw"
      ? status === "pending"
        ? "Pending ATM withdrawal"
        : "ATM withdrawal"
      : status === "pending"
        ? "Pending ATM deposit"
        : "ATM deposit";

  return `${prefix} at ${atm.name} - ${atm.location}`;
}

export function buildStoredAtmTransactionDescription(
  action: AtmAction,
  atmName: string,
  atmLocation: string,
  status: "pending" | "completed"
) {
  return buildAtmTransactionDescription(
    action,
    { name: atmName, location: atmLocation },
    status
  );
}

export function buildAtmInstruction(
  action: AtmAction,
  atm: Pick<AtmLocationSelection, "name">
) {
  if (action === "withdraw") {
    return `Use this code at ${atm.name}, then click I finished once the cash is dispensed.`;
  }

  return `Insert your cash or check at ${atm.name}, then click I finished once the ATM accepts the deposit.`;
}

export function generateAtmVerificationCode() {
  return `ATM-${Math.floor(100000 + Math.random() * 900000)}`;
}

export function generateAtmReferenceNumber(action: AtmAction) {
  const suffix = Math.floor(100 + Math.random() * 900);
  return `ATM-${action === "withdraw" ? "WTH" : "DEP"}-${Date.now()}-${suffix}`;
}

export function canUseAtmWithdrawal(accountType: string | null | undefined) {
  return isDepositEligible(accountType) || isCreditAccount(accountType);
}

export function canUseAtmDeposit(accountType: string | null | undefined) {
  return isDepositEligible(accountType);
}

export function getAtmAccountRestrictionMessage(
  accountType: string | null | undefined,
  action: AtmAction
) {
  if (action === "deposit" && !canUseAtmDeposit(accountType)) {
    return `${getAccountTypeLabel(accountType)} accounts cannot receive ATM deposits in this demo.`;
  }

  if (action === "withdraw" && !canUseAtmWithdrawal(accountType)) {
    return `${getAccountTypeLabel(accountType)} accounts cannot be used for ATM withdrawals in this demo.`;
  }

  return null;
}

export function getAtmAccountStatusErrorMessage(status: string | null | undefined) {
  const normalized = String(status || "").trim().toLowerCase();

  if (normalized === "frozen") {
    return "Frozen accounts cannot be used for ATM deposits or withdrawals.";
  }

  if (normalized === "closed") {
    return "Closed accounts cannot be used for ATM deposits or withdrawals.";
  }

  if (normalized !== "active") {
    return "Only active accounts can be used for ATM deposits or withdrawals.";
  }

  return null;
}
