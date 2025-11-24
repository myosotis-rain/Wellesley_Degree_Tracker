import MASMajorPlanner from "./MASMajorPlanner.jsx";
import CSMajorPlanner from "./CSMajorPlanner.jsx";
import BioMajorPlanner from "./BioMajorPlanner.jsx";
import MathMajorPlanner from "./MathMajorPlanner.jsx";
import EconMajorPlanner from "./EconMajorPlanner.jsx";
import EnglishMajorPlanner from "./EnglishMajorPlanner.jsx";
import AnthroMajorPlanner from "./AnthroMajorPlanner.jsx";
import AfricanaMajorPlanner from "./AfricanaMajorPlanner.jsx";
import AmericanStudiesPlanner from "./AmericanStudiesPlanner.jsx";
import ArchitectureMajorPlanner from "./ArchitectureMajorPlanner.jsx";
import StudioArtMajorPlanner from "./StudioArtMajorPlanner.jsx";
import ArtHistoryMajorPlanner from "./ArtHistoryMajorPlanner.jsx";
import BiochemistryMajorPlanner from "./BiochemistryMajorPlanner.jsx";
import ChemicalPhysicsMajorPlanner from "./ChemicalPhysicsMajorPlanner.jsx";
import ChemistryMajorPlanner from "./ChemistryMajorPlanner.jsx";
import CinemaMediaStudiesPlanner from "./CinemaMediaStudiesPlanner.jsx";
import ClassicsMajorPlanner from "./ClassicsMajorPlanner.jsx";
import CognitiveLinguisticSciencesPlanner from "./CognitiveLinguisticSciencesPlanner.jsx";
import ComparativeLitMajorPlanner from "./ComparativeLitMajorPlanner.jsx";
import DataScienceMajorPlanner from "./DataScienceMajorPlanner.jsx";
import EalcMajorPlanner from "./EalcMajorPlanner.jsx";
import EastAsianStudiesPlanner from "./EastAsianStudiesPlanner.jsx";
import EducationStudiesPlanner from "./EducationStudiesPlanner.jsx";
import EnvironmentalStudiesPlanner from "./EnvironmentalStudiesPlanner.jsx";
import FrenchMajorPlanner from "./FrenchMajorPlanner.jsx";
import FrenchCulturalStudiesPlanner from "./FrenchCulturalStudiesPlanner.jsx";
import GeosciencesMajorPlanner from "./GeosciencesMajorPlanner.jsx";
import GermanStudiesPlanner from "./GermanStudiesPlanner.jsx";
import HistoryMajorPlanner from "./HistoryMajorPlanner.jsx";
import ItalianStudiesPlanner from "./ItalianStudiesPlanner.jsx";
import JewishStudiesPlanner from "./JewishStudiesPlanner.jsx";
import LatinAmericanStudiesPlanner from "./LatinAmericanStudiesPlanner.jsx";
import MedievalRenaissanceStudiesPlanner from "./MedievalRenaissanceStudiesPlanner.jsx";
import MiddleEasternStudiesPlanner from "./MiddleEasternStudiesPlanner.jsx";
import MusicMajorPlanner from "./MusicMajorPlanner.jsx";
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
  "Architecture": ArchitectureMajorPlanner,
  "Studio Art": StudioArtMajorPlanner,
  "Art History": ArtHistoryMajorPlanner,
  "Biochemistry": BiochemistryMajorPlanner,
  "Chemical Physics": ChemicalPhysicsMajorPlanner,
  "Chemistry": ChemistryMajorPlanner,
  "Cinema and Media Studies": CinemaMediaStudiesPlanner,
  "Classics": ClassicsMajorPlanner,
  "Cognitive and Linguistic Sciences": CognitiveLinguisticSciencesPlanner,
  "Comparative Literary Studies": ComparativeLitMajorPlanner,
  "Data Science": DataScienceMajorPlanner,
  "East Asian Languages and Cultures": EalcMajorPlanner,
  "East Asian Studies": EastAsianStudiesPlanner,
  "Education Studies": EducationStudiesPlanner,
  "Environmental Studies": EnvironmentalStudiesPlanner,
  "French": FrenchMajorPlanner,
  "French Cultural Studies": FrenchCulturalStudiesPlanner,
  "Geosciences": GeosciencesMajorPlanner,
  "German Studies": GermanStudiesPlanner,
  "History": HistoryMajorPlanner,
  "Italian Studies": ItalianStudiesPlanner,
  "Jewish Studies": JewishStudiesPlanner,
  "Latin American Studies": LatinAmericanStudiesPlanner,
  "Medieval/Renaissance Studies": MedievalRenaissanceStudiesPlanner,
  "Middle Eastern Studies": MiddleEasternStudiesPlanner,
  "Music": MusicMajorPlanner,
};

export const getMajorRenderer = (majorName) => majorRendererRegistry[majorName] || GenericMajorPlanner;
