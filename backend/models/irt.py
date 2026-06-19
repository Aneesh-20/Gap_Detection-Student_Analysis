import numpy as np
from girth import twopl_mml

def fit_irt_model(df_pivot):
    """
    Fits a 2-Parameter Logistic (2PL) Item Response Theory (IRT) model using Marginal Maximum Likelihood (MML).
    
    This model estimates:
    - Student Ability: The latent trait representing the student's proficiency.
    - Question Difficulty: The point on the ability scale where a student has a 50% chance of a correct response.
    - Question Discrimination: How well the question differentiates between high and low ability students.
    
    Args:
        df_pivot (pd.DataFrame): A pandas DataFrame with student_ids as rows and question_ids as columns.
                                 Values should be 1 (correct), 0 (incorrect), or NaN/missing.
                                 
    Returns:
        dict: A dictionary containing estimated 'abilities', 'difficulties', 'discriminations', 
              along with the original 'student_ids' and 'question_ids'.
    """
    # Girth expects items as rows and people as columns.
    # df_pivot has students as rows, questions as columns. We transpose it.
    # Also, girth expects boolean or integer 0/1. It does not handle NaN natively in twopl_mml without some care,
    # Actually, girth handles missing values if we use the right method, but a common approach
    # for missing values in twopl_mml is just converting them to 0 (incorrect) or omitting.
    # Let's treat missing as 0 (incorrect) for simplicity in this prototype.
    
    data_matrix = df_pivot.fillna(0).values.T.astype(int)
    
    # Fit 2PL model
    # twopl_mml returns a tuple of (discrimination, difficulty, ability) or similar depending on the exact version.
    # Usually it returns a dictionary in recent versions of girth, let's use the standard output.
    # Actually, girth.twopl_mml returns a dictionary: {'Discrimination': array, 'Difficulty': array, 'Ability': array}
    # Wait, earlier versions returned a tuple. Let's assume girth >= 0.6.
    
    result = twopl_mml(data_matrix)
    
    # Extract parameters
    if isinstance(result, dict):
        discriminations = result.get('Discrimination', np.ones(data_matrix.shape[0]))
        difficulties = result.get('Difficulty', np.zeros(data_matrix.shape[0]))
        abilities = result.get('Ability', np.zeros(data_matrix.shape[1]))
    else:
        # Fallback if it's a tuple (discriminations, difficulties) and we need ability estimation separately
        # In some versions, twopl_mml returns (discriminations, difficulties). Ability is estimated separately.
        # Let's use the dictionary return which is standard in girth 0.6+
        discriminations = result[0]
        difficulties = result[1]
        if len(result) > 2:
            abilities = result[2]
        else:
            from girth.ability_methods import ability_mle
            abilities = ability_mle(data_matrix, difficulties, discriminations)

    return {
        'abilities': abilities,
        'difficulties': difficulties,
        'discriminations': discriminations,
        'student_ids': df_pivot.index.tolist(),
        'question_ids': df_pivot.columns.tolist()
    }
