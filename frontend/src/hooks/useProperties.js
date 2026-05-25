import { useQuery } from "@tanstack/react-query";
import { getProperties } from "../api/properties";
export const useProperties = (params) => useQuery({ queryKey: ["properties", params], queryFn: () => getProperties(params) });
