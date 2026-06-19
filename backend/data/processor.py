import pandas as pd
import numpy as np
import random

def get_mock_question_text(topic):
    templates = {
        'Algebra': ['If 2x + 5 = 13, what is the value of x?', 'Solve for y: 3y - 7 = 14', 'Factor the expression: x^2 - 4x + 4', 'What is the slope of the line y = 4x - 2?'],
        'Geometry': ['What is the area of a circle with radius 5?', 'Calculate the hypotenuse of a right triangle with sides 3 and 4.', 'How many degrees are in a hexagon?', 'Find the volume of a cube with side 3.'],
        'Calculus': ['Differentiate f(x) = 3x^3 - 2x^2 + x', 'Find the integral of 2x dx.', 'What is the limit of 1/x as x approaches infinity?', 'Determine the local maxima of f(x) = x^2 - 4x.'],
        'Statistics': ['What is the mean of [2, 4, 6, 8, 10]?', 'Define standard deviation.', 'What is the probability of rolling a 6 on a fair die?', 'Explain the central limit theorem.'],
        'Trigonometry': ['What is sin(30 degrees)?', 'Convert pi/4 radians to degrees.', 'Prove that sin^2(x) + cos^2(x) = 1', 'Find the amplitude of y = 3sin(2x).']
    }
    return random.choice(templates.get(topic, ['What is the answer to this question?']))

def generate_mock_data(num_students=200, num_questions=50):
    topics = ['Algebra', 'Geometry', 'Calculus', 'Statistics', 'Trigonometry']
    grades = ['Grade 9', 'Grade 10', 'Grade 11', 'Grade 12']
    q_types = ['MCQ', 'Short ans.']

    questions = []
    for i in range(num_questions):
        topic = random.choice(topics)
        # Introduce some intentionally poor discriminating questions (low discrimination) for the Weak Item Detector
        is_weak = random.random() < 0.1
        discrim = np.random.uniform(0.01, 0.15) if is_weak else np.random.lognormal(0, 0.3)
        
        diff = np.random.normal(0, 1)
        diff_label = 'Hard' if diff > 0.5 else ('Easy' if diff < -0.5 else 'Medium')
        
        questions.append({
            'question_id': f'Q-{str(i+1).zfill(3)}',
            'topic': topic,
            'grade': random.choice(grades),
            'type': random.choice(q_types),
            'text': get_mock_question_text(topic),
            'difficulty_label': diff_label,
            'true_difficulty': diff,
            'true_discrimination': discrim
        })
    df_questions = pd.DataFrame(questions)

    student_abilities = np.random.normal(0, 1, num_students)

    responses = []
    for s_idx, ability in enumerate(student_abilities):
        student_id = f'S-{str(s_idx+1).zfill(3)}'
        for _, q in df_questions.iterrows():
            prob_correct = 1 / (1 + np.exp(-q['true_discrimination'] * (ability - q['true_difficulty'])))
            
            if random.random() < 0.05:
                response = -1 
            else:
                response = 1 if random.random() < prob_correct else 0
                
            responses.append({
                'student_id': student_id,
                'question_id': q['question_id'],
                'response': response
            })
            
    df_responses = pd.DataFrame(responses)
    
    return df_responses, df_questions

def process_responses(df_responses):
    df_pivot = df_responses.pivot(index='student_id', columns='question_id', values='response')
    df_pivot = df_pivot.replace(-1, np.nan)
    return df_pivot
