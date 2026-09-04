import ActivateAccount from "@modules/Auth/components/ActivateAccount";

type ActivatePageProps = {
  searchParams: Promise<{ token?: string }>;
};

export default async function ActivatePage({ searchParams }: ActivatePageProps) {
  const { token } = await searchParams;
  return <ActivateAccount token={token ?? ""} />;
}
