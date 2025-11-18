import MASMajorPlanner from "./MASMajorPlanner.jsx";
import CSMajorPlanner from "./CSMajorPlanner.jsx";
import BioMajorPlanner from "./BioMajorPlanner.jsx";
import MathMajorPlanner from "./MathMajorPlanner.jsx";
import EconMajorPlanner from "./EconMajorPlanner.jsx";
import EnglishMajorPlanner from "./EnglishMajorPlanner.jsx";
import AnthroMajorPlanner from "./AnthroMajorPlanner.jsx";
import AfricanaMajorPlanner from "./AfricanaMajorPlanner.jsx";
import AmericanStudiesPlanner from "./AmericanStudiesPlanner.jsx";
import GenericMajorPlanner from "./GenericMajorPlanner.jsx";

export const majorRendererRegistry = {
  "Media Arts and Sciences": MASMajorPlanner,
  "Computer Science": CSMajorPlanner,
  "Biological Sciences": BioMajorPlanner,
  "Mathematics": MathMajorPlanner,
  "Economics": EconMajorPlanner,
  "English": EnglishMajorPlanner,
  "English and Creative Writing": EnglishMajorPlanner,
  "Anthropology": AnthroMajorPlanner,
  "Africana Studies": AfricanaMajorPlanner,
  "American Studies": AmericanStudiesPlanner,
};

export const getMajorRenderer = (majorName) => majorRendererRegistry[majorName] || GenericMajorPlanner;
